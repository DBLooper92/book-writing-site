import "client-only";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();

    browserClient = createBrowserClient<Database>(
      supabaseUrl,
      supabasePublishableKey
    );
  }

  return browserClient;
}
