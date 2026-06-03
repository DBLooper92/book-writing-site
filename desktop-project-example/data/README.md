# Data

This directory holds the local structured source of truth for the project.

## Runtime Files

The desktop app should create these files:

- `project.sqlite`
- `project.sqlite-wal`
- `project.sqlite-shm`

## Checked-In Files

- `schema.sql`: current schema snapshot
- `migrations/`: ordered schema and seed steps
- `example-queries.sql`: example read queries the app or scripts may use

## Local-First Scope Model

Because this is one project folder:

- the folder is the project boundary
- there is no need for cloud-era `user_id` and `project_id` on every row
- readable IDs still matter
- foreign keys still matter

