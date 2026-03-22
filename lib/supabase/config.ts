function getRequiredEnvVar(key: keyof NodeJS.ProcessEnv) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing Supabase environment variable: ${key}.`);
  }

  return value;
}

export const supabaseUrl = getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_URL");
export const supabasePublishableKey = getRequiredEnvVar(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"
);
