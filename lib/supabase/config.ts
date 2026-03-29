type SupabaseConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  if (!supabasePublishableKey) {
    throw new Error(
      "Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY."
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}
