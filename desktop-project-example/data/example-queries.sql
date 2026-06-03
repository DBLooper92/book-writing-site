SELECT id, display_name, role
FROM characters
ORDER BY display_name;

SELECT id, title, start_year, display_date_label
FROM timeline_events
ORDER BY start_year, same_day_sequence, title;

SELECT id, target_slice, proposed_action, review_status
FROM ai_proposals
ORDER BY created_at DESC;

