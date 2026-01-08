import { supabase } from "./supabaseClient";

export type Business = {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
};

export type BusinessSettings = {
  business_id: string;
  target_monthly_revenue: number | null;
  created_at: string;
};

export type DailyEntry = {
  id: string;
  business_id: string;
  entry_date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
  notes?: string | null;
  created_at: string;
};

export async function fetchMyBusiness(): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Business | null;
}

export async function fetchBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
  const { data, error } = await supabase
    .from("business_settings")
    .select("business_id,target_monthly_revenue,created_at")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as BusinessSettings | null;
}

export async function upsertBusinessSettings(params: {
  businessId: string;
  targetMonthlyRevenue: number | null;
}) {
  const { businessId, targetMonthlyRevenue } = params;

  const { error } = await supabase.from("business_settings").upsert(
    {
      business_id: businessId,
      target_monthly_revenue: targetMonthlyRevenue,
    },
    { onConflict: "business_id" }
  );

  if (error) throw error;
}

export async function upsertDailyEntry(params: {
  businessId: string;
  entryDate: string;
  revenue: number;
  orders: number;
  notes?: string;
}) {
  const { businessId, entryDate, revenue, orders, notes } = params;

  const { error } = await supabase
    .from("daily_entries")
    .upsert(
      {
        business_id: businessId,
        entry_date: entryDate,
        revenue,
        orders,
        notes: notes ?? null,
      },
      { onConflict: "business_id,entry_date" }
    );

  if (error) throw error;
}

export async function fetchEntriesLastDays(businessId: string, days: number): Promise<DailyEntry[]> {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);

  const fromStr = from.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("business_id", businessId)
    .gte("entry_date", fromStr)
    .order("entry_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailyEntry[];
}

export async function updateBusinessName(params: {
  businessId: string;
  name: string;
}) {
  const { error } = await supabase
    .from("businesses")
    .update({ name: params.name })
    .eq("id", params.businessId);

  if (error) throw error;
}