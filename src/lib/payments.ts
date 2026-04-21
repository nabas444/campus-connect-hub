import { supabase } from "@/integrations/supabase/client";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type PayoutStatus = "requested" | "approved" | "paid" | "rejected";
export type InvoiceStatus = "draft" | "issued" | "paid" | "void";
export type EarningStatus = "pending" | "available" | "paid_out";

export interface Payment {
  id: string;
  project_id: string;
  student_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  provider_reference: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  payment_id: string | null;
  project_id: string | null;
  student_id: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  pdf_path: string | null;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  expert_id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  method: string | null;
  notes: string | null;
  requested_at: string;
  processed_at: string | null;
}

export interface Earning {
  id: string;
  expert_id: string;
  project_id: string;
  milestone_id: string | null;
  amount: number;
  currency: string;
  status: EarningStatus;
  payout_id: string | null;
  created_at: string;
}

export function formatMoney(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

export async function listMyPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function listMyInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

export async function listMyEarnings() {
  const { data, error } = await supabase
    .from("expert_earnings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Earning[];
}

export async function listMyPayouts() {
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payout[];
}

export async function requestPayout(expertId: string, amount: number, method?: string, notes?: string) {
  const { data, error } = await supabase
    .from("payouts")
    .insert({ expert_id: expertId, amount, method, notes, status: "requested" })
    .select()
    .single();
  if (error) throw error;
  return data as Payout;
}

export async function listAllPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function listAllPayouts() {
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payout[];
}

export async function listAllInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

export async function setPaymentStatus(id: string, status: PaymentStatus) {
  const patch: Partial<Payment> = { status };
  if (status === "paid") patch.paid_at = new Date().toISOString();
  const { error } = await supabase.from("payments").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setPayoutStatus(id: string, status: PayoutStatus) {
  const patch: Record<string, unknown> = { status };
  if (status === "paid" || status === "rejected" || status === "approved") {
    patch.processed_at = new Date().toISOString();
  }
  const { error } = await supabase.from("payouts").update(patch).eq("id", id);
  if (error) throw error;
}