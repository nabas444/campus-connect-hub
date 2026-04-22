import { supabase } from "@/integrations/supabase/client";

export interface ExpertProfile {
  expert_id: string;
  headline: string | null;
  bio: string | null;
  hourly_rate: number | null;
  currency: string;
  years_experience: number | null;
  subjects: string[];
  avatar_url: string | null;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExpertReview {
  id: string;
  expert_id: string;
  project_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpertDirectoryEntry extends ExpertProfile {
  full_name: string | null;
  email: string | null;
}

export async function getExpertProfile(expertId: string) {
  const { data, error } = await supabase
    .from("expert_profiles")
    .select("*")
    .eq("expert_id", expertId)
    .maybeSingle();
  if (error) throw error;
  return data as ExpertProfile | null;
}

export async function upsertMyExpertProfile(expertId: string, patch: Partial<ExpertProfile>) {
  const { error } = await supabase
    .from("expert_profiles")
    .upsert({ expert_id: expertId, ...patch }, { onConflict: "expert_id" });
  if (error) throw error;
}

export async function listExpertDirectory(filters?: { subject?: string; minRating?: number }) {
  let query = supabase.from("expert_profiles").select("*").eq("is_available", true);
  if (filters?.subject) query = query.contains("subjects", [filters.subject]);
  if (filters?.minRating != null) query = query.gte("rating_avg", filters.minRating);
  const { data, error } = await query.order("rating_avg", { ascending: false });
  if (error) throw error;
  const profiles = (data ?? []) as ExpertProfile[];
  if (!profiles.length) return [];
  const ids = profiles.map((p) => p.expert_id);
  const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  return profiles.map((p) => {
    const meta = profs?.find((x) => x.id === p.expert_id);
    return { ...p, full_name: meta?.full_name ?? null, email: meta?.email ?? null } as ExpertDirectoryEntry;
  });
}

export async function listReviewsForExpert(expertId: string) {
  const { data, error } = await supabase
    .from("expert_reviews")
    .select("*")
    .eq("expert_id", expertId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExpertReview[];
}

export async function getMyReviewForProject(projectId: string, reviewerId: string) {
  const { data, error } = await supabase
    .from("expert_reviews")
    .select("*")
    .eq("project_id", projectId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle();
  if (error) throw error;
  return data as ExpertReview | null;
}

export async function submitReview(input: {
  expertId: string;
  projectId: string;
  reviewerId: string;
  rating: number;
  comment?: string;
}) {
  const existing = await getMyReviewForProject(input.projectId, input.reviewerId);
  if (existing) {
    const { error } = await supabase
      .from("expert_reviews")
      .update({ rating: input.rating, comment: input.comment ?? null })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("expert_reviews").insert({
    expert_id: input.expertId,
    project_id: input.projectId,
    reviewer_id: input.reviewerId,
    rating: input.rating,
    comment: input.comment ?? null,
  });
  if (error) throw error;
}

export const SUBJECT_SUGGESTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "Statistics", "Economics", "Engineering", "Literature", "History",
  "Psychology", "Business", "Law", "Medicine", "Languages",
];