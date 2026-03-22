import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export async function runSupabaseHealthcheck() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("projects").select("id").limit(1);

  if (error) {
    throw error;
  }

  return {
    empty: (data ?? []).length === 0,
    size: (data ?? []).length,
  };
}
