INSERT INTO project_metadata (key, value_json) VALUES
  ('project', '{"title":"The Glass Keep","slug":"the-glass-keep"}'),
  ('author_preferences', '{"calendar":"Common Reckoning","tone":"high-tension political fantasy"}');

INSERT INTO books (id, title, slug, summary, status, sort_order, created_at, updated_at) VALUES
  (
    'book-ashes-first-gate',
    'Ashes of the First Gate',
    'ashes-of-the-first-gate',
    'Mara uncovers proof that the city gate collapse was orchestrated.',
    'drafting',
    1,
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  );

INSERT INTO locations (id, name, location_type, summary, parent_location_id, created_at, updated_at) VALUES
  (
    'loc-north-gate-market',
    'North Gate Market',
    'district',
    'A crowded trading square just inside the city wall.',
    NULL,
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  ),
  (
    'loc-glass-keep',
    'The Glass Keep',
    'fortress',
    'A reflective citadel that dominates the capital skyline.',
    NULL,
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  );

INSERT INTO characters (id, display_name, role, summary, home_location_id, created_at, updated_at) VALUES
  (
    'char-mara-vesk',
    'Mara Vesk',
    'lead',
    'A courier turned reluctant investigator after the market riot.',
    'loc-north-gate-market',
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  );

INSERT INTO chapters (id, book_id, title, chapter_number, summary, created_at, updated_at) VALUES
  (
    'chapter-lantern-debts',
    'book-ashes-first-gate',
    'Lantern Debts',
    3,
    'Mara meets a hidden informant who survived the riot.',
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  );

INSERT INTO scenes (id, chapter_id, title, summary, pov_character_id, location_id, status, created_at, updated_at) VALUES
  (
    'scene-lantern-meeting',
    'chapter-lantern-debts',
    'The Lantern Meeting',
    'Mara learns the gate collapse was planned and not accidental.',
    'char-mara-vesk',
    'loc-north-gate-market',
    'draft',
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  );

INSERT INTO timeline_events (
  id,
  title,
  summary,
  start_year,
  start_month,
  start_day,
  end_year,
  end_month,
  end_day,
  same_day_sequence,
  display_date_label,
  linked_scene_id,
  created_at,
  updated_at
) VALUES
  (
    'event-market-riot',
    'North Gate Market Riot',
    'A staged riot covers the sabotage of the city gate.',
    742,
    8,
    19,
    NULL,
    NULL,
    NULL,
    0,
    '19 Harvest, 742',
    'scene-lantern-meeting',
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  );

INSERT INTO notes (id, title, body_markdown, note_type, created_at, updated_at) VALUES
  (
    'note-city-power-map',
    'City Power Map',
    'The gate wardens answer to the Keep on paper, but the market militias control movement after dusk.',
    'worldbuilding',
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  );

INSERT INTO attachments (id, related_entity_type, related_entity_id, storage_kind, relative_path, mime_type, created_at) VALUES
  (
    'attachment-market-map',
    'location',
    'loc-north-gate-market',
    'file',
    'attachments/images/north-gate-market-map.png',
    'image/png',
    '2026-04-07T10:00:00-04:00'
  );

INSERT INTO ai_sessions (
  id,
  session_type,
  title,
  status,
  source_path,
  source_excerpt,
  extraction_result_json,
  workflow_state_json,
  created_at,
  updated_at
) VALUES
  (
    'aisession-arrival-dump',
    'brain_dump',
    'Arrival Safehouse Brain Dump',
    'review',
    'inbox/brain-dumps/arrival-outline.md',
    'Mara reaches the canal safehouse before dawn and discovers the informant is already dead.',
    '{"summary":"Sample extraction result placeholder."}',
    '{"step":"proposal-review"}',
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  );

INSERT INTO ai_proposals (
  id,
  session_id,
  target_slice,
  target_id,
  proposed_action,
  review_status,
  proposal_json,
  created_at,
  updated_at
) VALUES
  (
    'proposal-safehouse-location',
    'aisession-arrival-dump',
    'locations',
    NULL,
    'create',
    'pending',
    '{"title":"South Canal Safehouse","summary":"Hidden refuge used by smugglers and dissidents."}',
    '2026-04-07T10:00:00-04:00',
    '2026-04-07T10:00:00-04:00'
  );
