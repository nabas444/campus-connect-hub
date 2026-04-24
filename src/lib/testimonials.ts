import { supabase } from "@/integrations/supabase/client";

export interface PublicTestimonial {
  id: string;
  position: number;
  subject: string;
  display_name: string;
  excerpt: string | null;
  rating: number;
  expert_name: string;
  expert_id: string | null;
  expert_rating_avg: number | null;
  expert_rating_count: number | null;
  completed_at: string | null;
  featured_at: string;
}

export interface FeaturedTestimonial {
  id: string;
  project_id: string;
  review_id: string;
  display_name: string | null;
  public_excerpt: string | null;
  subject_label: string | null;
  position: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface EligibleProject {
  project_id: string;
  project_title: string;
  subject: string;
  completed_at: string | null;
  expert_id: string | null;
  expert_name: string | null;
  student_id: string;
  student_name: string | null;
  review_id: string;
  rating: number;
  comment: string | null;
  featured_id: string | null;
  is_featured: boolean;
}

export async function listPublicTestimonials(): Promise<PublicTestimonial[]> {
  const { data, error } = await supabase
    .from("testimonials_public" as any)
    .select("*")
    .order("position", { ascending: true })
    .order("featured_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PublicTestimonial[];
}

export async function listEligibleProjects(): Promise<EligibleProject[]> {
  // Reviews on completed projects, joined with project + profile data, plus any existing featured row.
  const { data: reviews, error } = await supabase
    .from("expert_reviews")
    .select("id, project_id, expert_id, rating, comment, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const reviewList = reviews ?? [];
  if (!reviewList.length) return [];

  const projectIds = Array.from(new Set(reviewList.map((r) => r.project_id)));
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, subject, completed_at, status, student_id, assigned_expert_id")
    .in("id", projectIds)
    .eq("status", "completed");
  const projectMap = new Map((projects ?? []).map((p: any) => [p.id, p]));

  const userIds = Array.from(
    new Set(
      (projects ?? []).flatMap((p: any) => [p.student_id, p.assigned_expert_id]).filter(Boolean) as string[]
    )
  );
  const { data: profs } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as any[] };
  const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));

  const { data: featured } = await supabase
    .from("featured_testimonials")
    .select("id, project_id, is_featured");
  const featuredMap = new Map((featured ?? []).map((f: any) => [f.project_id, f]));

  const out: EligibleProject[] = [];
  for (const r of reviewList) {
    const p = projectMap.get(r.project_id);
    if (!p) continue;
    const f = featuredMap.get(r.project_id);
    out.push({
      project_id: p.id,
      project_title: p.title,
      subject: p.subject,
      completed_at: p.completed_at,
      expert_id: p.assigned_expert_id,
      expert_name: p.assigned_expert_id ? profMap.get(p.assigned_expert_id) ?? null : null,
      student_id: p.student_id,
      student_name: profMap.get(p.student_id) ?? null,
      review_id: r.id,
      rating: r.rating,
      comment: r.comment,
      featured_id: f?.id ?? null,
      is_featured: f?.is_featured ?? false,
    });
  }
  return out;
}

export async function featureProject(input: {
  projectId: string;
  reviewId: string;
  displayName?: string | null;
  publicExcerpt?: string | null;
  subjectLabel?: string | null;
  createdBy: string;
}) {
  const { error } = await supabase.from("featured_testimonials").upsert(
    {
      project_id: input.projectId,
      review_id: input.reviewId,
      display_name: input.displayName ?? null,
      public_excerpt: input.publicExcerpt ?? null,
      subject_label: input.subjectLabel ?? null,
      is_featured: true,
      created_by: input.createdBy,
    },
    { onConflict: "project_id" }
  );
  if (error) throw error;
}

export async function setFeaturedFlag(id: string, isFeatured: boolean) {
  const { error } = await supabase
    .from("featured_testimonials")
    .update({ is_featured: isFeatured })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteFeatured(id: string) {
  const { error } = await supabase.from("featured_testimonials").delete().eq("id", id);
  if (error) throw error;
}