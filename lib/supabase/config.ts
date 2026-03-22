const supabaseUrlValue = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKeyValue =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrlValue) {
  throw new Error("Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL.");
}

if (!supabasePublishableKeyValue) {
  throw new Error(
    "Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY."
  );
}

export const supabaseUrl = supabaseUrlValue;
export const supabasePublishableKey = supabasePublishableKeyValue;
