alter table if exists public.profiles
  add column if not exists openai_api_key_encrypted text,
  add column if not exists openai_api_key_last4 text,
  add column if not exists openai_api_key_updated_at timestamptz;
