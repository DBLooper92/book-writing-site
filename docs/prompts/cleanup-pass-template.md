# Cleanup Pass Template

Use this template when asking Codex to do a second-pass cleanup or consistency pass on the repo.

## Prompt Template

Do a cleanup pass on this repository.

Before making changes, read:

- `AGENTS.md`
- `docs/README.md`
- `docs/architecture/current-status.md`
- `docs/architecture/system-architecture.md`
- all relevant files under `docs/patterns/`
- feature docs related to the area you touch

Goals:

- align the code and docs with the current architecture
- remove drift between implemented behavior and documentation
- preserve the project-scoped Supabase data model
- keep changes modular and maintainable
- prefer improving existing patterns over inventing new ones

Deliverables:

- updated code and docs
- explicit note of what was implemented already, what was partial, and what remains planned
- concise summary of files changed and any assumptions made
