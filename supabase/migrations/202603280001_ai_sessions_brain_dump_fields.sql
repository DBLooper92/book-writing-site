alter table if exists public.ai_sessions
  add column if not exists source_text text not null default '',
  add column if not exists source_guidance text not null default '',
  add column if not exists extraction_status text not null default 'not_requested',
  add column if not exists extraction_error text not null default '',
  add column if not exists extraction_model text not null default '',
  add column if not exists extraction_result jsonb;
