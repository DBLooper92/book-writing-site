create table if not exists public.books (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  series_order integer,
  internal_chronology_start integer,
  internal_chronology_end integer,
  premise text not null default '',
  draft_stage text not null,
  word_count_target integer,
  word_count_current integer not null default 0,
  primary_themes text[] not null default '{}',
  main_characters text[] not null default '{}',
  key_locations text[] not null default '{}',
  related_plot_threads text[] not null default '{}',
  chapter_ids text[] not null default '{}',
  scene_ids text[] not null default '{}',
  timeline_event_ids text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.chapters (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  book_id text,
  chapter_number integer,
  purpose text not null default '',
  point_of_view_character_id text,
  timeline_event_ids text[] not null default '{}',
  scene_ids text[] not null default '{}',
  location_ids text[] not null default '{}',
  character_ids text[] not null default '{}',
  plot_thread_ids text[] not null default '{}',
  foreshadows text[] not null default '{}',
  payoffs text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.scenes (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  book_id text,
  chapter_id text,
  scene_number integer,
  scene_type text not null,
  point_of_view_character_id text,
  goal text not null default '',
  conflict text not null default '',
  outcome text not null default '',
  text_draft text not null default '',
  timeline_event_ids text[] not null default '{}',
  character_ids text[] not null default '{}',
  location_ids text[] not null default '{}',
  plot_thread_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.characters (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  aliases text[] not null default '{}',
  character_type text not null,
  importance_level text not null,
  birth_year integer,
  death_year integer,
  apparent_age text not null default '',
  actual_age text not null default '',
  species_id text,
  culture_ids text[] not null default '{}',
  faction_ids text[] not null default '{}',
  religion_ids text[] not null default '{}',
  language_ids text[] not null default '{}',
  home_location_id text,
  current_location_id text,
  occupation text[] not null default '{}',
  skills text[] not null default '{}',
  traits text[] not null default '{}',
  flaws text[] not null default '{}',
  motivations text[] not null default '{}',
  fears text[] not null default '{}',
  secrets text[] not null default '{}',
  beliefs text[] not null default '{}',
  appearance text not null default '',
  voice_profile text not null default '',
  arc_summary text not null default '',
  arc_start_state text not null default '',
  arc_end_state text not null default '',
  key_relationship_ids text[] not null default '{}',
  timeline_event_ids text[] not null default '{}',
  book_ids text[] not null default '{}',
  chapter_ids text[] not null default '{}',
  scene_ids text[] not null default '{}',
  important_items text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.relationships (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  relationship_type text not null,
  entity_a_type text not null,
  entity_a_id text not null,
  entity_b_type text not null,
  entity_b_id text not null,
  dynamic_status text not null default '',
  history text not null default '',
  tensions text[] not null default '{}',
  strengths text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.factions (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  faction_type text not null,
  founded_year integer,
  ended_year integer,
  leader_character_ids text[] not null default '{}',
  base_location_ids text[] not null default '{}',
  culture_ids text[] not null default '{}',
  religion_ids text[] not null default '{}',
  government_id text,
  goals text[] not null default '{}',
  resources text[] not null default '{}',
  rivals text[] not null default '{}',
  allies text[] not null default '{}',
  timeline_event_ids text[] not null default '{}',
  book_ids text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.cultures (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  core_values text[] not null default '{}',
  traditions text[] not null default '{}',
  associated_location_ids text[] not null default '{}',
  language_ids text[] not null default '{}',
  religion_ids text[] not null default '{}',
  faction_ids text[] not null default '{}',
  era_ids text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.religions (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  deity_or_focus text not null default '',
  belief_system_type text not null default '',
  core_beliefs text[] not null default '{}',
  rituals text[] not null default '{}',
  holy_sites text[] not null default '{}',
  associated_cultures text[] not null default '{}',
  associated_organizations text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.governments (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  government_type text not null,
  seat_location_id text,
  leader_titles text[] not null default '{}',
  jurisdiction_notes text not null default '',
  faction_ids text[] not null default '{}',
  organization_ids text[] not null default '{}',
  law_priorities text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.organizations (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  organization_type text not null,
  founded_year integer,
  base_location_ids text[] not null default '{}',
  leader_titles text[] not null default '{}',
  member_count_estimate integer,
  goals text[] not null default '{}',
  resources text[] not null default '{}',
  alliances text[] not null default '{}',
  rivals text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.plot_threads (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  thread_type text not null,
  introduced_in_book_id text,
  resolved_in_book_id text,
  character_ids text[] not null default '{}',
  timeline_event_ids text[] not null default '{}',
  book_ids text[] not null default '{}',
  chapter_ids text[] not null default '{}',
  scene_ids text[] not null default '{}',
  theme_ids text[] not null default '{}',
  note_ids text[] not null default '{}',
  setup_notes text[] not null default '{}',
  payoff_notes text[] not null default '{}',
  open_questions text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.outlines (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  outline_type text not null,
  scope text not null default '',
  act_structure text[] not null default '{}',
  milestones text[] not null default '{}',
  book_ids text[] not null default '{}',
  thread_ids text[] not null default '{}',
  note_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.glossary_terms (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  term text not null,
  definition text not null default '',
  category text not null default '',
  related_entity_types text[] not null default '{}',
  related_entity_ids text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.eras (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  start_year integer,
  end_year integer,
  defining_events text[] not null default '{}',
  key_locations text[] not null default '{}',
  key_factions text[] not null default '{}',
  dominant_themes text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.themes (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  central_question text not null default '',
  associated_book_ids text[] not null default '{}',
  associated_character_ids text[] not null default '{}',
  associated_timeline_event_ids text[] not null default '{}',
  associated_era_ids text[] not null default '{}',
  associated_plot_thread_ids text[] not null default '{}',
  motifs text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.languages (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  language_family text not null default '',
  writing_system text not null default '',
  primary_regions text[] not null default '{}',
  dialects text[] not null default '{}',
  loan_sources text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.species (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  origin text not null default '',
  lifespan text not null default '',
  appearance text not null default '',
  biology text not null default '',
  reproduction text not null default '',
  diet text not null default '',
  psychology text not null default '',
  social_structure text not null default '',
  abilities text[] not null default '{}',
  limitations text[] not null default '{}',
  notable_subgroups text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.items (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  item_type text not null default '',
  owner_character_ids text[] not null default '{}',
  location_ids text[] not null default '{}',
  faction_ids text[] not null default '{}',
  created_year integer,
  material text not null default '',
  abilities text[] not null default '{}',
  limitations text[] not null default '{}',
  symbolic_meaning text not null default '',
  timeline_event_ids text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.technologies (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  technology_type text not null default '',
  invented_year integer,
  inventor_notes text not null default '',
  power_source text not null default '',
  limitations text[] not null default '{}',
  associated_location_ids text[] not null default '{}',
  associated_faction_ids text[] not null default '{}',
  timeline_event_ids text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.locations (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  name text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  location_type text not null default '',
  parent_location_id text,
  child_location_ids text[] not null default '{}',
  era_ids text[] not null default '{}',
  culture_ids text[] not null default '{}',
  faction_ids text[] not null default '{}',
  population_notes text not null default '',
  climate text not null default '',
  geography text not null default '',
  architecture text not null default '',
  economy text not null default '',
  customs text[] not null default '{}',
  danger_level text not null default '',
  notable_features text[] not null default '{}',
  timeline_event_ids text[] not null default '{}',
  book_ids text[] not null default '{}',
  character_ids text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.timeline_events (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  event_type text not null,
  year_start integer,
  month_start integer,
  day_start integer,
  year_end integer,
  month_end integer,
  day_end integer,
  chronology_order integer,
  time_of_day_label text not null default '',
  display_date_label text not null default '',
  era_id text,
  book_ids text[] not null default '{}',
  chapter_ids text[] not null default '{}',
  scene_ids text[] not null default '{}',
  character_ids text[] not null default '{}',
  location_ids text[] not null default '{}',
  faction_ids text[] not null default '{}',
  culture_ids text[] not null default '{}',
  technology_ids text[] not null default '{}',
  religion_ids text[] not null default '{}',
  plot_thread_ids text[] not null default '{}',
  theme_ids text[] not null default '{}',
  causes text[] not null default '{}',
  consequences text[] not null default '{}',
  predecessor_event_ids text[] not null default '{}',
  successor_event_ids text[] not null default '{}',
  public_wiki_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.notes (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  content text not null default '',
  note_type text not null default '',
  linked_entity_type text,
  linked_entity_id text,
  linked_book_ids text[] not null default '{}',
  linked_chapter_ids text[] not null default '{}',
  linked_character_ids text[] not null default '{}',
  linked_location_ids text[] not null default '{}',
  linked_event_ids text[] not null default '{}',
  linked_thread_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.retcons (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  old_canon text not null default '',
  new_canon text not null default '',
  reason text not null default '',
  impact_level text not null,
  affected_entity_types text[] not null default '{}',
  affected_entity_ids text[] not null default '{}',
  resolved boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.attachments (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  attachment_type text not null,
  storage_status text not null,
  file_name text not null default '',
  mime_type text not null default '',
  source_note text not null default '',
  url text,
  linked_entity_type text,
  linked_entity_id text,
  linked_note_ids text[] not null default '{}',
  linked_outline_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.ai_sessions (
  user_id uuid not null,
  project_id text not null,
  id text not null,
  title text not null,
  slug text not null,
  summary text not null default '',
  description text not null default '',
  status text not null,
  tags text[] not null default '{}',
  is_archived boolean not null default false,
  canon_level text not null,
  confidence text not null,
  session_type text not null,
  provider text not null default '',
  model text not null default '',
  purpose text not null default '',
  prompt_excerpt text not null default '',
  output_summary text not null default '',
  linked_entity_types text[] not null default '{}',
  linked_entity_ids text[] not null default '{}',
  messages_count integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, project_id, id),
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create index if not exists books_scope_idx on public.books (user_id, project_id);
create index if not exists chapters_scope_idx on public.chapters (user_id, project_id);
create index if not exists scenes_scope_idx on public.scenes (user_id, project_id);
create index if not exists characters_scope_idx on public.characters (user_id, project_id);
create index if not exists relationships_scope_idx on public.relationships (user_id, project_id);
create index if not exists factions_scope_idx on public.factions (user_id, project_id);
create index if not exists cultures_scope_idx on public.cultures (user_id, project_id);
create index if not exists religions_scope_idx on public.religions (user_id, project_id);
create index if not exists governments_scope_idx on public.governments (user_id, project_id);
create index if not exists organizations_scope_idx on public.organizations (user_id, project_id);
create index if not exists plot_threads_scope_idx on public.plot_threads (user_id, project_id);
create index if not exists outlines_scope_idx on public.outlines (user_id, project_id);
create index if not exists glossary_terms_scope_idx on public.glossary_terms (user_id, project_id);
create index if not exists eras_scope_idx on public.eras (user_id, project_id);
create index if not exists themes_scope_idx on public.themes (user_id, project_id);
create index if not exists languages_scope_idx on public.languages (user_id, project_id);
create index if not exists species_scope_idx on public.species (user_id, project_id);
create index if not exists items_scope_idx on public.items (user_id, project_id);
create index if not exists technologies_scope_idx on public.technologies (user_id, project_id);
create index if not exists locations_scope_idx on public.locations (user_id, project_id);
create index if not exists timeline_events_scope_idx on public.timeline_events (user_id, project_id);
create index if not exists notes_scope_idx on public.notes (user_id, project_id);
create index if not exists retcons_scope_idx on public.retcons (user_id, project_id);
create index if not exists attachments_scope_idx on public.attachments (user_id, project_id);
create index if not exists ai_sessions_scope_idx on public.ai_sessions (user_id, project_id);
create index if not exists timeline_events_sort_idx
  on public.timeline_events (user_id, project_id, year_start, month_start, day_start, chronology_order);

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at before update on public.books
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists chapters_set_updated_at on public.chapters;
create trigger chapters_set_updated_at before update on public.chapters
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists scenes_set_updated_at on public.scenes;
create trigger scenes_set_updated_at before update on public.scenes
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at before update on public.characters
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists relationships_set_updated_at on public.relationships;
create trigger relationships_set_updated_at before update on public.relationships
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists factions_set_updated_at on public.factions;
create trigger factions_set_updated_at before update on public.factions
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists cultures_set_updated_at on public.cultures;
create trigger cultures_set_updated_at before update on public.cultures
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists religions_set_updated_at on public.religions;
create trigger religions_set_updated_at before update on public.religions
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists governments_set_updated_at on public.governments;
create trigger governments_set_updated_at before update on public.governments
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists plot_threads_set_updated_at on public.plot_threads;
create trigger plot_threads_set_updated_at before update on public.plot_threads
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists outlines_set_updated_at on public.outlines;
create trigger outlines_set_updated_at before update on public.outlines
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists glossary_terms_set_updated_at on public.glossary_terms;
create trigger glossary_terms_set_updated_at before update on public.glossary_terms
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists eras_set_updated_at on public.eras;
create trigger eras_set_updated_at before update on public.eras
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists themes_set_updated_at on public.themes;
create trigger themes_set_updated_at before update on public.themes
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists languages_set_updated_at on public.languages;
create trigger languages_set_updated_at before update on public.languages
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists species_set_updated_at on public.species;
create trigger species_set_updated_at before update on public.species
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at before update on public.items
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists technologies_set_updated_at on public.technologies;
create trigger technologies_set_updated_at before update on public.technologies
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at before update on public.locations
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists timeline_events_set_updated_at on public.timeline_events;
create trigger timeline_events_set_updated_at before update on public.timeline_events
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at before update on public.notes
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists retcons_set_updated_at on public.retcons;
create trigger retcons_set_updated_at before update on public.retcons
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists attachments_set_updated_at on public.attachments;
create trigger attachments_set_updated_at before update on public.attachments
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists ai_sessions_set_updated_at on public.ai_sessions;
create trigger ai_sessions_set_updated_at before update on public.ai_sessions
for each row execute function public.set_current_timestamp_updated_at();

grant select, insert, update, delete on public.books to anon, authenticated;
