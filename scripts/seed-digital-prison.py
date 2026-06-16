from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
import shutil


REPO_ROOT = Path(__file__).resolve().parents[1]
PROJECTS_ROOT = Path(r"C:\Users\veloc\Documents\BookWritingProjects")
APP_DATA_ROOT = Path(r"C:\Users\veloc\AppData\Roaming\book-bible-desktop")
APP_SETTINGS_PATH = APP_DATA_ROOT / "app-settings.json"

PROJECT_ID = "digital-prison"
PROJECT_TITLE = "Digital Prison"
PROJECT_DIR = PROJECTS_ROOT / PROJECT_ID

TABLES = [
    "projects",
    "books",
    "chapters",
    "scenes",
    "characters",
    "relationships",
    "factions",
    "cultures",
    "religions",
    "governments",
    "organizations",
    "plot_threads",
    "outlines",
    "glossary_terms",
    "eras",
    "themes",
    "languages",
    "species",
    "items",
    "technologies",
    "locations",
    "timeline_events",
    "notes",
    "retcons",
    "attachments",
]

SANDBOX_PROJECTS = [
    "braindump-sandbox-horror-trilogy-2026-06-01",
    "braindump-sandbox-horror-trilogy-2026-06-02",
    "insertion-window-sandbox-2026-06-01",
    "insertion-window-sandbox-2026-06-01-pass2",
    "insertion-window-sandbox-2026-06-01-pass3",
    "insertion-window-sandbox-2026-06-01-pass4",
    "insertion-window-sandbox-2026-06-01-pass5",
    "insertion-window-sandbox-2026-06-01-pass6",
]


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slugify(value: str) -> str:
    out = []
    last_dash = False
    for ch in value.lower().strip():
        if ch.isalnum():
            out.append(ch)
            last_dash = False
        else:
            if not last_dash:
                out.append("-")
                last_dash = True
    return "".join(out).strip("-") or "item"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_text(path: Path, content: str) -> None:
    ensure_dir(path.parent)
    path.write_text(content, encoding="utf-8")


def write_json(path: Path, value) -> None:
    ensure_dir(path.parent)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def remove_tree_inside_projects_root(target: Path) -> None:
    resolved = target.resolve()
    root = PROJECTS_ROOT.resolve()
    if root not in resolved.parents and resolved != root:
        raise RuntimeError(f"Refusing to delete outside projects root: {resolved}")
    if resolved.exists():
        shutil.rmtree(resolved)


def build_project_scaffold() -> None:
    ensure_dir(PROJECT_DIR)
    for rel in [
        "data/migrations",
        "attachments/images",
        "attachments/documents",
        "exports/canon",
        "exports/manuscript",
        "exports/timeline",
        "exports/indexes",
        "inbox/brain-dumps",
        "prompts",
        "proposals/pending",
        "proposals/approved",
        "proposals/rejected",
        "proposals/applied",
        "scripts",
    ]:
        ensure_dir(PROJECT_DIR / rel)

    manifest = {
        "id": PROJECT_ID,
        "slug": PROJECT_ID,
        "title": PROJECT_TITLE,
        "createdAt": iso_now(),
        "templateVersion": 1,
        "storage": {
            "databaseFile": "data/project.sqlite",
            "migrationsDir": "data/migrations",
            "attachmentsDir": "attachments",
            "exportsDir": "exports",
            "proposalsDir": "proposals",
        },
        "workflow": {
            "proposalMode": "review-first",
            "applyMode": "explicit-approval-only",
            "defaultExportFormat": "markdown-and-json",
        },
        "chronology": {
            "calendarLabel": "Common Reckoning",
            "yearZeroAllowed": False,
        },
    }
    write_json(PROJECT_DIR / "project.json", manifest)
    write_text(
        PROJECT_DIR / "README.md",
        "# Digital Prison\n\nLocal test project for timeline braindump insertion-window testing.\n",
    )
    write_text(
        PROJECT_DIR / "AGENTS.md",
        """# AGENTS.md

## Purpose

This project folder is a local-first writing workspace for one story project.

The desktop app is the editor and SQLite owner.
Codex is a sidecar assistant that can read project files, search exports, draft proposal files, and help apply approved changes through scripts.

## Source Of Truth

- Canonical structured data lives in `data/project.sqlite`
- Readable AI context lives in generated files under `exports/`
- Raw user input lives under `inbox/`
- Review-first AI output lives under `proposals/`

Do not treat Markdown exports as the source of truth.
Do not edit exports directly unless the user explicitly asks for a manual correction and understands it will be overwritten.

## Safety Rules

1. Do not mutate the database by hand when a script exists.
2. Do not apply canon changes without an approved proposal.
3. Prefer generating a proposal file over directly editing structured records.
4. Keep IDs readable and stable.
5. Keep one project per folder. The folder boundary is the project scope.
6. Attachments stay on disk and are referenced from the database by relative path.
""",
    )
    write_text(
        PROJECT_DIR / "data/migrations/0001_initial_document_tables.sql",
        "-- Placeholder migration for the Digital Prison seed project.\n",
    )
    write_text(
        PROJECT_DIR / "scripts/bootstrap.ps1",
        "Write-Host 'Open the project in BuildaBook to initialize or repair the database.'\n",
    )


def open_db() -> sqlite3.Connection:
    db_path = PROJECT_DIR / "data" / "project.sqlite"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    for table in TABLES:
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS "{table}" (
                id TEXT PRIMARY KEY,
                slug TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                document_json TEXT NOT NULL
            );
            """
        )
        conn.execute(f'CREATE INDEX IF NOT EXISTS "idx_{table}_slug" ON "{table}" (slug);')
        conn.execute(
            f'CREATE INDEX IF NOT EXISTS "idx_{table}_updated_at" ON "{table}" (updated_at);'
        )
    conn.commit()
    return conn


def insert_doc(conn: sqlite3.Connection, table: str, doc: dict) -> None:
    payload = dict(doc)
    payload.setdefault("slug", slugify(payload.get("title") or payload.get("name") or payload.get("id", "")))
    payload.setdefault("created_at", iso_now())
    payload.setdefault("updated_at", payload["created_at"])
    conn.execute(
        f'INSERT OR REPLACE INTO "{table}" (id, slug, created_at, updated_at, document_json) VALUES (?, ?, ?, ?, ?)',
        (
            str(payload["id"]),
            payload.get("slug"),
            payload["created_at"],
            payload["updated_at"],
            json.dumps(payload, ensure_ascii=False),
        ),
    )


def insert_many(conn: sqlite3.Connection, table: str, rows: list[dict]) -> None:
    for row in rows:
        insert_doc(conn, table, row)


def table_rows(conn: sqlite3.Connection, table: str) -> list[dict]:
    cur = conn.execute(f'SELECT document_json FROM "{table}"')
    rows = []
    for (doc_json,) in cur.fetchall():
        rows.append(json.loads(doc_json))
    return rows


def write_markdown(path: Path, title: str, rows: list[dict]) -> None:
    lines = [f"# {title}", "", f"Total records: {len(rows)}", ""]
    for row in rows:
        label = row.get("title") or row.get("name") or row.get("term") or row.get("file_name") or row.get("id")
        lines.append(f"## {label}")
        lines.append(f"- ID: {row.get('id')}")
        if row.get("summary"):
            lines.append(f"- Summary: {row['summary']}")
        if row.get("status"):
            lines.append(f"- Status: {row['status']}")
        lines.append("")
    write_text(path, "\n".join(lines))


def write_exports(conn: sqlite3.Connection) -> None:
    export_root = PROJECT_DIR / "exports"
    canon_root = export_root / "canon"
    manuscript_root = export_root / "manuscript"
    timeline_root = export_root / "timeline"
    indexes_root = export_root / "indexes"
    for d in [canon_root, manuscript_root, timeline_root, indexes_root]:
        ensure_dir(d)

    all_docs: dict[str, list[dict]] = {}
    for table in TABLES:
        if table == "projects":
            continue
        all_docs[table] = table_rows(conn, table)
        write_json(canon_root / f"{table}.json", all_docs[table])
        write_markdown(canon_root / f"{table}.md", table, all_docs[table])

    books = all_docs.get("books", [])
    write_json(manuscript_root / "books.json", books)
    write_markdown(manuscript_root / "Books.md", "Books", books)

    timeline = sorted(
        all_docs.get("timeline_events", []),
        key=lambda row: (
            row.get("year_start") if row.get("year_start") is not None else 10**12,
            row.get("chronology_order") if row.get("chronology_order") is not None else 10**12,
            row.get("title") or row.get("id"),
        ),
    )
    write_json(timeline_root / "chronology.json", timeline)
    write_markdown(timeline_root / "chronology.md", "Timeline", timeline)

    entity_index = [{"slice": table, "count": len(rows)} for table, rows in all_docs.items()]
    write_json(indexes_root / "entity-index.json", entity_index)
    write_markdown(indexes_root / "entity-index.md", "Entity Index", entity_index)


def update_app_settings() -> None:
    settings = {}
    if APP_SETTINGS_PATH.exists():
        settings = json.loads(APP_SETTINGS_PATH.read_text(encoding="utf-8"))

    recents = []
    seen = set()
    for recent in settings.get("recentProjects", []):
        base = Path(recent.get("path", "")).name.lower()
        if base in {"the-tribute", "this-is-a-tribute"} and base not in seen:
            recents.append(recent)
            seen.add(base)

    recents = [
        {"id": PROJECT_ID, "title": PROJECT_TITLE, "path": str(PROJECT_DIR), "lastOpenedAt": iso_now()}
    ] + recents

    if not any(Path(item.get("path", "")).name.lower() == "the-tribute" for item in recents):
        recents.append(
            {
                "id": "the-tribute",
                "title": "The Tribute",
                "path": str(PROJECTS_ROOT / "the-tribute"),
            }
        )

    if not any(Path(item.get("path", "")).name.lower() == "this-is-a-tribute" for item in recents):
        recents.append(
            {
                "id": "this-is-a-tribute",
                "title": "this-is-a-tribute",
                "path": str(PROJECTS_ROOT / "this-is-a-tribute"),
            }
        )

    settings["currentProjectPath"] = str(PROJECT_DIR)
    settings["currentProjectId"] = PROJECT_ID
    settings["recentProjects"] = recents
    APP_DATA_ROOT.mkdir(parents=True, exist_ok=True)
    APP_SETTINGS_PATH.write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")


def seed(conn: sqlite3.Connection) -> None:
    seed_time = iso_now()
    book_id = "book_digital_prison"
    era_id = "era_federation_century"
    character_ids = {
        "elias": "char_elias_arden",
        "lena": "char_lena_voss",
        "rhoq": "char_rhoq_sellix",
        "mara": "char_mara_quin",
    }
    location_ids = {
        "hall": "loc_civic_patent_hall",
        "vault": "loc_helix_secure_vault",
        "grid": "loc_axiom_grid",
        "colosseum": "loc_veyr_colosseum",
        "arcade": "loc_sponsor_arcade",
        "district": "loc_silent_district_9",
    }
    faction_ids = {
        "human": "faction_human_federation",
        "helix": "faction_helix_security",
        "veyr": "faction_veyr_federation",
        "guilds": "faction_battle_guilds",
    }
    tech_ids = {
        "replication": "technology_open_replication_mesh",
        "prison": "technology_digital_prison_shell",
        "combat": "technology_combat_lattice",
    }
    theme_ids = {
        "free_access": "theme_free_access",
        "cruelty": "theme_institutional_cruelty",
        "identity": "theme_identity_persistence",
        "detachment": "theme_detachment",
    }
    plot_ids = {
        "free_tech": "plot_free_technology",
        "transfer": "plot_digital_prison_transfer",
        "guild_refusal": "plot_guild_refusal",
    }
    chapter_ids = {
        "one": "chapter_free_access",
        "two": "chapter_transfer",
        "three": "chapter_century_war",
    }
    scene_ids = {
        "one": "scene_patent_hall",
        "two": "scene_digital_transfer",
        "three": "scene_century_endurance",
    }

    insert_many(
        conn,
        "projects",
        [
            {
                "id": PROJECT_ID,
                "title": PROJECT_TITLE,
                "slug": PROJECT_ID,
                "summary": "A novella test project for exercising single-event and multi-event timeline braindumps.",
                "description": "An elderly inventor releases free replication tech, is arrested, sold across federation borders, and endures a century of digital prison battles.",
                "genre": "science fiction",
                "tone": "grim reflective procedural",
                "themes": ["free access", "institutional cruelty", "identity persistence", "detachment"],
                "timeline_start_year": 2410,
                "timeline_end_year": 2510,
                "default_calendar_system_id": None,
                "primary_point_of_view_style": "third-person limited",
                "writing_status": "draft",
                "book_order_mode": "manual",
                "notes_root_id": "notes_root_digital_prison",
                "settings": {
                    "allowPublicWiki": False,
                    "allowAIWriting": True,
                    "allowAIEditing": True,
                    "defaultTimelineScale": "century",
                    "spoilerPolicy": "full",
                },
                "status": "active",
                "created_at": seed_time,
                "updated_at": seed_time,
            }
        ],
    )

    insert_many(
        conn,
        "books",
        [
            {
                "id": book_id,
                "title": "Digital Prison",
                "summary": "A test novella about a banned inventor trapped in a digital prison and sold into alien arena warfare.",
                "description": "Project seed for testing timeline AI insertion windows and post-review event mapping.",
                "status": "planning",
                "tags": ["test", "novella"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "series_order": 1,
                "internal_chronology_start": 2410,
                "internal_chronology_end": 2510,
                "premise": "An old inventor tries to give free replication technology to everyone and pays for it with a century in digital prison.",
                "draft_stage": "outline",
                "word_count_target": None,
                "word_count_current": 0,
                "primary_themes": list(theme_ids.values()),
                "main_characters": [character_ids["elias"], character_ids["mara"]],
                "key_locations": [location_ids["hall"], location_ids["grid"], location_ids["colosseum"]],
                "related_plot_threads": list(plot_ids.values()),
                "chapter_ids": list(chapter_ids.values()),
                "scene_ids": list(scene_ids.values()),
                "timeline_event_ids": [],
                "public_wiki_summary": "A novella-length seed project used to verify braindump insertion behavior.",
                "created_at": seed_time,
                "updated_at": seed_time,
            }
        ],
    )

    insert_many(
        conn,
        "eras",
        [
            {
                "id": era_id,
                "name": "Federation Century",
                "summary": "A century-long prison era spanning the arrest, transfer, and battle cycles.",
                "description": "The time period covering Elias Arden’s digital imprisonment and long survival.",
                "status": "active",
                "tags": ["test"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "start_year": 2410,
                "end_year": 2510,
                "defining_events": [],
                "key_locations": [location_ids["grid"], location_ids["colosseum"]],
                "key_factions": [faction_ids["human"], faction_ids["veyr"], faction_ids["guilds"]],
                "dominant_themes": [theme_ids["cruelty"], theme_ids["identity"]],
                "public_wiki_summary": "The era of prison-city war games and cross-federation prisoner transfers.",
                "created_at": seed_time,
                "updated_at": seed_time,
            }
        ],
    )

    insert_many(
        conn,
        "characters",
        [
            {
                "id": character_ids["elias"],
                "name": "Elias Arden",
                "summary": "An elderly inventor and hacker who releases free replication technology.",
                "description": "Elias refuses to commercialize a machine that should belong to everyone, and the state answers with a digital prison sentence.",
                "status": "active",
                "tags": ["protagonist"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "high",
                "aliases": ["Old Elias"],
                "character_type": "protagonist",
                "importance_level": "primary",
                "birth_year": 2341,
                "death_year": None,
                "apparent_age": "80s",
                "actual_age": "80+",
                "species_id": None,
                "culture_ids": [],
                "faction_ids": [faction_ids["human"]],
                "religion_ids": [],
                "language_ids": [],
                "home_location_id": location_ids["hall"],
                "current_location_id": location_ids["grid"],
                "occupation": ["inventor", "hacker"],
                "skills": ["systems intrusion", "replication design", "survival"],
                "traits": ["stubborn", "patient", "detached"],
                "flaws": ["rigid", "isolated"],
                "motivations": ["free access to technology"],
                "fears": ["becoming useful to his captors"],
                "secrets": ["he still believes one clean act could matter"],
                "beliefs": ["technology should be shared"],
                "appearance": "Thin, weathered, and slow-moving, with a sharp watchful stare.",
                "voice_profile": "Dry, quiet, precise.",
                "arc_summary": "He shifts from principled rebellion to hard survival without surrendering the original idea.",
                "arc_start_state": "Hopeful and defiant.",
                "arc_end_state": "Detached but still unbroken.",
                "key_relationship_ids": [],
                "timeline_event_ids": [],
                "book_ids": [book_id],
                "chapter_ids": list(chapter_ids.values()),
                "scene_ids": list(scene_ids.values()),
                "important_items": ["replication mesh prototype"],
                "public_wiki_summary": "The old inventor at the center of the prison story.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": character_ids["lena"],
                "name": "Lena Voss",
                "summary": "A slick digital security employee who sells prisoners across federation borders.",
                "description": "She treats humans as inventory and turns compliance into personal profit.",
                "status": "active",
                "tags": ["antagonist"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "aliases": [],
                "character_type": "antagonist",
                "importance_level": "secondary",
                "birth_year": 2380,
                "death_year": None,
                "apparent_age": "40s",
                "actual_age": "40s",
                "species_id": None,
                "culture_ids": [],
                "faction_ids": [faction_ids["helix"]],
                "religion_ids": [],
                "language_ids": [],
                "home_location_id": location_ids["vault"],
                "current_location_id": location_ids["vault"],
                "occupation": ["security officer", "transfer broker"],
                "skills": ["records control", "pressure tactics"],
                "traits": ["slick", "pragmatic"],
                "flaws": ["greedy", "callous"],
                "motivations": ["profit"],
                "fears": ["losing leverage"],
                "secrets": ["she skims from prisoner transfers"],
                "beliefs": ["everything has a market"],
                "appearance": "Immaculate, polished, and always a step too calm.",
                "voice_profile": "Warm, clinical, and persuasive.",
                "arc_summary": "She remains functional because she never stops monetizing the suffering around her.",
                "arc_start_state": "Confident and opportunistic.",
                "arc_end_state": "Still profitable.",
                "key_relationship_ids": [],
                "timeline_event_ids": [],
                "book_ids": [book_id],
                "chapter_ids": [chapter_ids["one"], chapter_ids["two"]],
                "scene_ids": [scene_ids["one"], scene_ids["two"]],
                "important_items": [],
                "public_wiki_summary": "The security employee who profits from prison transfers.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": character_ids["rhoq"],
                "name": "Rhoq Sellix",
                "summary": "An alien arena broker and combat organizer.",
                "description": "Rhoq understands the prison sports circuit as both theater and violent commerce.",
                "status": "active",
                "tags": ["supporting"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "aliases": [],
                "character_type": "supporting",
                "importance_level": "secondary",
                "birth_year": None,
                "death_year": None,
                "apparent_age": "unknown",
                "actual_age": "unknown",
                "species_id": None,
                "culture_ids": [],
                "faction_ids": [faction_ids["veyr"]],
                "religion_ids": [],
                "language_ids": [],
                "home_location_id": location_ids["colosseum"],
                "current_location_id": location_ids["colosseum"],
                "occupation": ["arena broker"],
                "skills": ["matchmaking", "combat scheduling"],
                "traits": ["shrewd"],
                "flaws": ["transactional"],
                "motivations": ["win the wagering market"],
                "fears": ["unprofitable chaos"],
                "secrets": [],
                "beliefs": ["spectacle is a currency"],
                "appearance": "Alien and angular, always framed by holo-ads and match data.",
                "voice_profile": "Measured and commercial.",
                "arc_summary": "He stays on the boundary between administrator and predator.",
                "arc_start_state": "Watchful.",
                "arc_end_state": "Still in the arena business.",
                "key_relationship_ids": [],
                "timeline_event_ids": [],
                "book_ids": [book_id],
                "chapter_ids": [chapter_ids["two"], chapter_ids["three"]],
                "scene_ids": [scene_ids["two"], scene_ids["three"]],
                "important_items": [],
                "public_wiki_summary": "A broker who turns prison battles into sports programming.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": character_ids["mara"],
                "name": "Mara Quin",
                "summary": "A prisoner who becomes part of Elias’s small, quiet circle.",
                "description": "Mara survives by learning the prison city and avoiding the guild machinery.",
                "status": "active",
                "tags": ["supporting"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "aliases": [],
                "character_type": "supporting",
                "importance_level": "secondary",
                "birth_year": 2368,
                "death_year": None,
                "apparent_age": "60s",
                "actual_age": "60s",
                "species_id": None,
                "culture_ids": [],
                "faction_ids": [faction_ids["veyr"]],
                "religion_ids": [],
                "language_ids": [],
                "home_location_id": location_ids["grid"],
                "current_location_id": location_ids["district"],
                "occupation": ["prisoner"],
                "skills": ["route memory", "survival"],
                "traits": ["quiet", "pragmatic"],
                "flaws": ["guarded"],
                "motivations": ["stay alive"],
                "fears": ["becoming an asset"],
                "secrets": ["she helps Elias because he never asks for anything"],
                "beliefs": ["detachment is safer than hope"],
                "appearance": "Sparingly expressive, with the kind of focus that comes from long captivity.",
                "voice_profile": "Low, clipped, and careful.",
                "arc_summary": "She is one of the few people Elias lets close enough to matter.",
                "arc_start_state": "Isolated.",
                "arc_end_state": "Still surviving beside him.",
                "key_relationship_ids": [],
                "timeline_event_ids": [],
                "book_ids": [book_id],
                "chapter_ids": [chapter_ids["two"], chapter_ids["three"]],
                "scene_ids": [scene_ids["two"], scene_ids["three"]],
                "important_items": [],
                "public_wiki_summary": "A quiet prisoner in Elias’s small circle.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
        ],
    )

    insert_many(
        conn,
        "locations",
        [
            {
                "id": location_ids["hall"],
                "name": "Civic Patent Hall",
                "summary": "Where Elias first tries to give away the replication mesh.",
                "description": "A public hall in the human federation where innovation is normally licensed and fenced off.",
                "status": "active",
                "tags": ["city"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "location_type": "government building",
                "parent_location_id": None,
                "child_location_ids": [],
                "era_ids": [era_id],
                "culture_ids": [],
                "faction_ids": [faction_ids["human"]],
                "population_notes": "",
                "climate": "controlled",
                "geography": "urban core",
                "architecture": "formal and fluorescent",
                "economy": "bureaucratic",
                "customs": ["patent review"],
                "danger_level": "moderate",
                "notable_features": ["public hearing dais"],
                "timeline_event_ids": ["event_digital_prison_2410_01", "event_digital_prison_2413_04"],
                "book_ids": [book_id],
                "character_ids": [character_ids["elias"], character_ids["lena"]],
                "public_wiki_summary": "A hall where free technology becomes a crime.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": location_ids["vault"],
                "name": "Helix Secure Vault",
                "summary": "Corporate security headquarters that tracks the breach.",
                "description": "A glossy data fortress where Lena Voss handles prison transfers and black-budget enforcement.",
                "status": "active",
                "tags": ["corporate"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "location_type": "facility",
                "parent_location_id": None,
                "child_location_ids": [],
                "era_ids": [era_id],
                "culture_ids": [],
                "faction_ids": [faction_ids["helix"]],
                "population_notes": "",
                "climate": "sterile",
                "geography": "sealed tower complex",
                "architecture": "polished and layered",
                "economy": "enforcement and licensing",
                "customs": ["silent audit"],
                "danger_level": "high",
                "notable_features": ["prison transfer terminals"],
                "timeline_event_ids": ["event_digital_prison_2411_02", "event_digital_prison_2412_03", "event_digital_prison_2415_06"],
                "book_ids": [book_id],
                "character_ids": [character_ids["lena"]],
                "public_wiki_summary": "The corporate site where the transfer economy is managed.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": location_ids["grid"],
                "name": "Axiom Grid",
                "summary": "The digital prison city where inmates can roam when not battling.",
                "description": "A simulated city-grid with little visible supervision but pervasive system constraints.",
                "status": "active",
                "tags": ["digital"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "location_type": "digital city",
                "parent_location_id": None,
                "child_location_ids": [],
                "era_ids": [era_id],
                "culture_ids": [],
                "faction_ids": [faction_ids["veyr"]],
                "population_notes": "Mostly prisoners and training AIs.",
                "climate": "synthetic",
                "geography": "grid blocks and sponsor corridors",
                "architecture": "modular simulation blocks",
                "economy": "sponsor incentives",
                "customs": ["train or lose"],
                "danger_level": "extreme",
                "notable_features": ["battle portals", "quiet districts"],
                "timeline_event_ids": [
                    "event_digital_prison_2414_05",
                    "event_digital_prison_2435_09",
                    "event_digital_prison_2460_11",
                    "event_digital_prison_2490_12",
                ],
                "book_ids": [book_id],
                "character_ids": [character_ids["elias"], character_ids["mara"]],
                "public_wiki_summary": "The prison city where survival is a daily discipline.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": location_ids["colosseum"],
                "name": "Veyr Colosseum",
                "summary": "The arena where prisoners fight under alien spectators.",
                "description": "A brutal amphitheater used for scheduled digital battles, siege simulations, and weekly sporting events.",
                "status": "active",
                "tags": ["arena"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "location_type": "arena",
                "parent_location_id": None,
                "child_location_ids": [],
                "era_ids": [era_id],
                "culture_ids": [],
                "faction_ids": [faction_ids["veyr"]],
                "population_notes": "Rotating crowds and betting syndicates.",
                "climate": "controlled",
                "geography": "tiered amphitheater",
                "architecture": "wide and brutal",
                "economy": "spectacle betting",
                "customs": ["fight to survive"],
                "danger_level": "extreme",
                "notable_features": ["holo-scoreboards"],
                "timeline_event_ids": ["event_digital_prison_2416_07", "event_digital_prison_2420_08", "event_digital_prison_2510_13"],
                "book_ids": [book_id],
                "character_ids": [character_ids["elias"], character_ids["rhoq"]],
                "public_wiki_summary": "The arena heart of the prison sports circuit.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": location_ids["arcade"],
                "name": "Sponsor Arcade",
                "summary": "A recreational wing where sponsors load temporary goods and perks.",
                "description": "A merchant district for taste patches, food programs, games, and illicit comforts.",
                "status": "active",
                "tags": ["commercial"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "location_type": "market",
                "parent_location_id": None,
                "child_location_ids": [],
                "era_ids": [era_id],
                "culture_ids": [],
                "faction_ids": [faction_ids["guilds"]],
                "population_notes": "Prisoners and guild buyers.",
                "climate": "pleasant",
                "geography": "arcade lanes",
                "architecture": "bright and commercial",
                "economy": "sponsorship packages",
                "customs": ["offer perks for wins"],
                "danger_level": "moderate",
                "notable_features": ["taste receptor booths"],
                "timeline_event_ids": ["event_digital_prison_2444_10"],
                "book_ids": [book_id],
                "character_ids": [character_ids["elias"], character_ids["rhoq"]],
                "public_wiki_summary": "A place where prison fighters are sold comforts and deals.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": location_ids["district"],
                "name": "Silent District 9",
                "summary": "A quiet zone where the detached prisoners retreat between fights.",
                "description": "A low-noise quarter of the prison city favored by prisoners who want to think or avoid the guilds.",
                "status": "active",
                "tags": ["residential"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "location_type": "district",
                "parent_location_id": None,
                "child_location_ids": [],
                "era_ids": [era_id],
                "culture_ids": [],
                "faction_ids": [faction_ids["veyr"]],
                "population_notes": "Mostly exhausted inmates and a few small cliques.",
                "climate": "quiet",
                "geography": "narrow streets and low-light blocks",
                "architecture": "plain and repetitive",
                "economy": "barter and favor exchange",
                "customs": ["mind your own fight"],
                "danger_level": "low",
                "notable_features": ["sound-damped lanes"],
                "timeline_event_ids": ["event_digital_prison_2460_11"],
                "book_ids": [book_id],
                "character_ids": [character_ids["elias"], character_ids["mara"]],
                "public_wiki_summary": "A quiet district used by prisoners who refuse the guilds.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
        ],
    )

    insert_many(
        conn,
        "factions",
        [
            {
                "id": faction_ids["human"],
                "name": "Human Federation",
                "summary": "Humanity’s coalition membership, still treated as junior despite centuries of service.",
                "description": "A trade-and-defense federation that regards humans as a lesser and newer species.",
                "status": "active",
                "tags": ["political"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "faction_type": "political_movement",
                "founded_year": None,
                "ended_year": None,
                "leader_character_ids": [],
                "base_location_ids": [location_ids["hall"]],
                "culture_ids": [],
                "religion_ids": [],
                "government_id": None,
                "goals": ["stability"],
                "resources": ["bureaucracy"],
                "rivals": [faction_ids["helix"], faction_ids["veyr"]],
                "allies": [],
                "timeline_event_ids": ["event_digital_prison_2413_04"],
                "book_ids": [book_id],
                "public_wiki_summary": "The human coalition that hands Elias over to the machine of law.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": faction_ids["helix"],
                "name": "Helix Security",
                "summary": "Corporate security network that polices intellectual property and prison transfers.",
                "description": "The company-facing enforcement wing with strong ties to the government.",
                "status": "active",
                "tags": ["corporate"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "faction_type": "merchant_company",
                "founded_year": None,
                "ended_year": None,
                "leader_character_ids": [character_ids["lena"]],
                "base_location_ids": [location_ids["vault"]],
                "culture_ids": [],
                "religion_ids": [],
                "government_id": None,
                "goals": ["protect profits"],
                "resources": ["records"],
                "rivals": [faction_ids["human"]],
                "allies": [faction_ids["veyr"]],
                "timeline_event_ids": ["event_digital_prison_2411_02", "event_digital_prison_2412_03", "event_digital_prison_2415_06"],
                "book_ids": [book_id],
                "public_wiki_summary": "The security arm that turns free tech into a criminal matter.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": faction_ids["veyr"],
                "name": "Veyr Federation",
                "summary": "A more violent but still economically linked neighboring federation.",
                "description": "The receiving federation for the digital prison sports circuit and the arena fights.",
                "status": "active",
                "tags": ["alien"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "faction_type": "political_movement",
                "founded_year": None,
                "ended_year": None,
                "leader_character_ids": [],
                "base_location_ids": [location_ids["colosseum"]],
                "culture_ids": [],
                "religion_ids": [],
                "government_id": None,
                "goals": ["spectacle and control"],
                "resources": ["arenas"],
                "rivals": [faction_ids["human"]],
                "allies": [faction_ids["helix"]],
                "timeline_event_ids": ["event_digital_prison_2416_07", "event_digital_prison_2420_08", "event_digital_prison_2510_13"],
                "book_ids": [book_id],
                "public_wiki_summary": "The alien federation that buys and weaponizes the prison population.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": faction_ids["guilds"],
                "name": "Battle Guilds",
                "summary": "Prisoner guilds that organize sponsorships and specialized combat programs.",
                "description": "Groups that recruit inmates for ability tracks and monetize their wins.",
                "status": "active",
                "tags": ["guild"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "faction_type": "guild",
                "founded_year": None,
                "ended_year": None,
                "leader_character_ids": [],
                "base_location_ids": [location_ids["arcade"]],
                "culture_ids": [],
                "religion_ids": [],
                "government_id": None,
                "goals": ["profit from wins"],
                "resources": ["sponsors", "programs"],
                "rivals": [],
                "allies": [faction_ids["veyr"]],
                "timeline_event_ids": ["event_digital_prison_2444_10"],
                "book_ids": [book_id],
                "public_wiki_summary": "The guild system that turns prisoner talent into sponsorship income.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
        ],
    )

    insert_many(
        conn,
        "technologies",
        [
            {
                "id": tech_ids["replication"],
                "name": "Open Replication Mesh",
                "summary": "Free technology for copying matter and design patterns.",
                "description": "The invention Elias tries to release to everyone instead of selling under license.",
                "status": "active",
                "tags": ["invention"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "technology_type": "replication",
                "invented_year": 2410,
                "inventor_notes": "Elias built it to be shared, not monetized.",
                "power_source": "distributed mesh",
                "limitations": ["needs stable input"],
                "associated_location_ids": [location_ids["hall"]],
                "associated_faction_ids": [faction_ids["human"]],
                "timeline_event_ids": ["event_digital_prison_2410_01", "event_digital_prison_2412_03"],
                "public_wiki_summary": "A free replication system that triggers the arrest arc.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": tech_ids["prison"],
                "name": "Digital Prison Shell",
                "summary": "The containment framework used to hold prisoners as software selves.",
                "description": "A prison system that stretches time and pain while keeping prisoners conscious.",
                "status": "active",
                "tags": ["infrastructure"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "technology_type": "containment",
                "invented_year": 2414,
                "inventor_notes": "Converted from security infrastructure into punishment infrastructure.",
                "power_source": "federation compute",
                "limitations": ["time dilation", "conscious persistence"],
                "associated_location_ids": [location_ids["grid"]],
                "associated_faction_ids": [faction_ids["veyr"], faction_ids["helix"]],
                "timeline_event_ids": ["event_digital_prison_2414_05", "event_digital_prison_2415_06"],
                "public_wiki_summary": "The shell that keeps Elias alive and punishable.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": tech_ids["combat"],
                "name": "Combat Lattice",
                "summary": "The battle environment used for arena simulations and war games.",
                "description": "The tactical engine that turns prison time into weekly sporting events and military scenarios.",
                "status": "active",
                "tags": ["combat"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "technology_type": "simulation",
                "invented_year": 2416,
                "inventor_notes": "Updated continually for new battle formats.",
                "power_source": "arena compute",
                "limitations": ["pain feedback"],
                "associated_location_ids": [location_ids["colosseum"]],
                "associated_faction_ids": [faction_ids["veyr"], faction_ids["guilds"]],
                "timeline_event_ids": ["event_digital_prison_2416_07", "event_digital_prison_2420_08", "event_digital_prison_2435_09"],
                "public_wiki_summary": "The prison battle system used to force prisoners into repeated fights.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
        ],
    )

    insert_many(
        conn,
        "themes",
        [
            {
                "id": theme_ids["free_access"],
                "name": "Free Access",
                "summary": "The refusal to lock technology behind paywalls and ownership monopolies.",
                "description": "Elias’s initial motive and the thing the governments punish most aggressively.",
                "status": "active",
                "tags": ["core"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "central_question": "Can useful technology belong to everyone?",
                "associated_book_ids": [book_id],
                "associated_character_ids": [character_ids["elias"]],
                "associated_timeline_event_ids": ["event_digital_prison_2410_01", "event_digital_prison_2412_03", "event_digital_prison_2413_04"],
                "associated_era_ids": [era_id],
                "associated_plot_thread_ids": [plot_ids["free_tech"]],
                "motifs": ["sharing"],
                "public_wiki_summary": "The theme of refusing to privatize technology.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": theme_ids["cruelty"],
                "name": "Institutional Cruelty",
                "summary": "Systems that profit from reduced human status.",
                "description": "The digital prison, the transfers, and the sports circuit all convert suffering into revenue.",
                "status": "active",
                "tags": ["dark"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "central_question": "How much harm can a system justify as procedure?",
                "associated_book_ids": [book_id],
                "associated_character_ids": [character_ids["lena"], character_ids["rhoq"]],
                "associated_timeline_event_ids": ["event_digital_prison_2415_06", "event_digital_prison_2416_07", "event_digital_prison_2420_08"],
                "associated_era_ids": [era_id],
                "associated_plot_thread_ids": [plot_ids["transfer"]],
                "motifs": ["paperwork", "profit"],
                "public_wiki_summary": "The theme of bureaucracy turned into punishment machinery.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": theme_ids["identity"],
                "name": "Identity Persistence",
                "summary": "Whether a self remains itself after digital copying, pain, and time dilation.",
                "description": "A long-term theme about continuity under repeated death and restoration.",
                "status": "active",
                "tags": ["philosophical"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "central_question": "What survives when the body is gone?",
                "associated_book_ids": [book_id],
                "associated_character_ids": [character_ids["elias"], character_ids["mara"]],
                "associated_timeline_event_ids": ["event_digital_prison_2414_05", "event_digital_prison_2435_09", "event_digital_prison_2490_12"],
                "associated_era_ids": [era_id],
                "associated_plot_thread_ids": [plot_ids["transfer"], plot_ids["guild_refusal"]],
                "motifs": ["memory", "continuity"],
                "public_wiki_summary": "The question of whether Elias is still himself after a century of digital punishment.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": theme_ids["detachment"],
                "name": "Detachment",
                "summary": "The emotional narrowing that can survive only by caring less.",
                "description": "Elias’s survival strategy after a century of battles and sponsor incentives.",
                "status": "active",
                "tags": ["character"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "central_question": "What does endurance cost?",
                "associated_book_ids": [book_id],
                "associated_character_ids": [character_ids["elias"], character_ids["mara"]],
                "associated_timeline_event_ids": ["event_digital_prison_2444_10", "event_digital_prison_2460_11", "event_digital_prison_2510_13"],
                "associated_era_ids": [era_id],
                "associated_plot_thread_ids": [plot_ids["guild_refusal"]],
                "motifs": ["silence", "distance"],
                "public_wiki_summary": "The theme of surviving by wanting less.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
        ],
    )

    insert_many(
        conn,
        "plot_threads",
        [
            {
                "id": plot_ids["free_tech"],
                "title": "Free Technology",
                "summary": "Elias tries to distribute replication tech instead of monetizing it.",
                "description": "The initial act that brings the company and federation machinery down on him.",
                "status": "active",
                "tags": ["main"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "thread_type": "book_arc",
                "introduced_in_book_id": book_id,
                "resolved_in_book_id": None,
                "character_ids": [character_ids["elias"]],
                "timeline_event_ids": ["event_digital_prison_2410_01", "event_digital_prison_2412_03", "event_digital_prison_2413_04"],
                "book_ids": [book_id],
                "chapter_ids": [chapter_ids["one"]],
                "scene_ids": [scene_ids["one"]],
                "theme_ids": [theme_ids["free_access"]],
                "note_ids": [],
                "setup_notes": ["Start with a public demonstration."],
                "payoff_notes": [],
                "open_questions": ["Can free access survive the legal backlash?"],
                "public_wiki_summary": "The opening thread about free technology and its punishment.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": plot_ids["transfer"],
                "title": "Digital Prison Transfer",
                "summary": "The handoff from human federation custody into the alien prison economy.",
                "description": "The transfer arc that turns punishment into exportable inventory.",
                "status": "active",
                "tags": ["main"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "thread_type": "subplot",
                "introduced_in_book_id": book_id,
                "resolved_in_book_id": None,
                "character_ids": [character_ids["elias"], character_ids["lena"], character_ids["rhoq"]],
                "timeline_event_ids": ["event_digital_prison_2414_05", "event_digital_prison_2415_06", "event_digital_prison_2416_07", "event_digital_prison_2420_08"],
                "book_ids": [book_id],
                "chapter_ids": [chapter_ids["two"]],
                "scene_ids": [scene_ids["two"]],
                "theme_ids": [theme_ids["cruelty"], theme_ids["identity"]],
                "note_ids": [],
                "setup_notes": ["Move the prisoner across federation lines."],
                "payoff_notes": [],
                "open_questions": ["How long can a digital prisoner endure the battle cycle?"],
                "public_wiki_summary": "The transfer into the alien arena economy.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": plot_ids["guild_refusal"],
                "title": "Guild Refusal",
                "summary": "Elias repeatedly refuses to join a combat guild.",
                "description": "The refusal is part principle, part exhaustion, and part refusal to become useful to his captors.",
                "status": "active",
                "tags": ["character"],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "thread_type": "character_arc",
                "introduced_in_book_id": book_id,
                "resolved_in_book_id": None,
                "character_ids": [character_ids["elias"], character_ids["mara"]],
                "timeline_event_ids": ["event_digital_prison_2444_10", "event_digital_prison_2460_11", "event_digital_prison_2490_12", "event_digital_prison_2510_13"],
                "book_ids": [book_id],
                "chapter_ids": [chapter_ids["three"]],
                "scene_ids": [scene_ids["three"]],
                "theme_ids": [theme_ids["detachment"], theme_ids["identity"]],
                "note_ids": [],
                "setup_notes": ["Offer guild sponsorships repeatedly."],
                "payoff_notes": [],
                "open_questions": ["Will refusal outlast the prison incentives?"],
                "public_wiki_summary": "The long refusal to become a guild asset.",
                "created_at": seed_time,
                "updated_at": seed_time,
            },
        ],
    )

    insert_many(
        conn,
        "chapters",
        [
            {
                "id": chapter_ids["one"],
                "title": "Free Access",
                "summary": "The invention and arrest.",
                "description": "Elias unveils the replication mesh, is hunted, and is sentenced.",
                "status": "outline",
                "tags": [],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "book_id": book_id,
                "chapter_number": 1,
                "purpose": "Launch the free-technology conflict.",
                "point_of_view_character_id": character_ids["elias"],
                "timeline_event_ids": ["event_digital_prison_2410_01", "event_digital_prison_2411_02", "event_digital_prison_2412_03", "event_digital_prison_2413_04"],
                "scene_ids": [scene_ids["one"]],
                "location_ids": [location_ids["hall"], location_ids["vault"]],
                "character_ids": [character_ids["elias"], character_ids["lena"]],
                "plot_thread_ids": [plot_ids["free_tech"]],
                "foreshadows": [],
                "payoffs": [],
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": chapter_ids["two"],
                "title": "Transfer",
                "summary": "The sale into the alien prison economy.",
                "description": "The human prison becomes a commodity and Elias loses the last illusion of legal protection.",
                "status": "outline",
                "tags": [],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "book_id": book_id,
                "chapter_number": 2,
                "purpose": "Move Elias into the battle circuit.",
                "point_of_view_character_id": character_ids["elias"],
                "timeline_event_ids": ["event_digital_prison_2414_05", "event_digital_prison_2415_06", "event_digital_prison_2416_07", "event_digital_prison_2420_08"],
                "scene_ids": [scene_ids["two"]],
                "location_ids": [location_ids["grid"], location_ids["colosseum"]],
                "character_ids": [character_ids["elias"], character_ids["lena"], character_ids["rhoq"]],
                "plot_thread_ids": [plot_ids["transfer"]],
                "foreshadows": [],
                "payoffs": [],
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": chapter_ids["three"],
                "title": "Century War",
                "summary": "Decades of digital battles and training loops.",
                "description": "Elias survives through detachment, small alliances, and refusing the guilds.",
                "status": "outline",
                "tags": [],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "book_id": book_id,
                "chapter_number": 3,
                "purpose": "Show the century-long consequence of digital imprisonment.",
                "point_of_view_character_id": character_ids["elias"],
                "timeline_event_ids": ["event_digital_prison_2435_09", "event_digital_prison_2444_10", "event_digital_prison_2460_11", "event_digital_prison_2490_12", "event_digital_prison_2510_13"],
                "scene_ids": [scene_ids["three"]],
                "location_ids": [location_ids["grid"], location_ids["arcade"], location_ids["district"], location_ids["colosseum"]],
                "character_ids": [character_ids["elias"], character_ids["mara"], character_ids["rhoq"]],
                "plot_thread_ids": [plot_ids["guild_refusal"]],
                "foreshadows": [],
                "payoffs": [],
                "created_at": seed_time,
                "updated_at": seed_time,
            },
        ],
    )

    insert_many(
        conn,
        "scenes",
        [
            {
                "id": scene_ids["one"],
                "title": "Patent Hall Demonstration",
                "summary": "Elias tries to hand out the mesh in public.",
                "description": "A city scene built around a demonstration and the first signs of legal danger.",
                "status": "outline",
                "tags": [],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "book_id": book_id,
                "chapter_id": chapter_ids["one"],
                "scene_number": 1,
                "scene_type": "setup",
                "point_of_view_character_id": character_ids["elias"],
                "goal": "Convince people to accept free technology.",
                "conflict": "Officials move to shut him down.",
                "outcome": "The demonstration becomes evidence.",
                "text_draft": "",
                "timeline_event_ids": ["event_digital_prison_2410_01", "event_digital_prison_2411_02", "event_digital_prison_2412_03", "event_digital_prison_2413_04"],
                "character_ids": [character_ids["elias"], character_ids["lena"]],
                "location_ids": [location_ids["hall"], location_ids["vault"]],
                "plot_thread_ids": [plot_ids["free_tech"]],
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": scene_ids["two"],
                "title": "Federation Transfer",
                "summary": "The digital prison sale and the first arena intake.",
                "description": "A corridor of custody, data seals, and a bureaucrat profiting from human bodies reduced to software.",
                "status": "outline",
                "tags": [],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "book_id": book_id,
                "chapter_id": chapter_ids["two"],
                "scene_number": 2,
                "scene_type": "conflict",
                "point_of_view_character_id": character_ids["elias"],
                "goal": "Understand what the prison shell is doing to him.",
                "conflict": "The transfer makes him a commodity.",
                "outcome": "He is sold into the Veyr system.",
                "text_draft": "",
                "timeline_event_ids": ["event_digital_prison_2414_05", "event_digital_prison_2415_06", "event_digital_prison_2416_07", "event_digital_prison_2420_08"],
                "character_ids": [character_ids["elias"], character_ids["lena"], character_ids["rhoq"]],
                "location_ids": [location_ids["grid"], location_ids["colosseum"]],
                "plot_thread_ids": [plot_ids["transfer"]],
                "created_at": seed_time,
                "updated_at": seed_time,
            },
            {
                "id": scene_ids["three"],
                "title": "Century Endurance",
                "summary": "The long battle cycle and the small circle of survivors.",
                "description": "A prison-city sequence showing training, war games, sponsor perks, and the cost of choosing not to join a guild.",
                "status": "outline",
                "tags": [],
                "is_archived": False,
                "canon_level": "working",
                "confidence": "medium",
                "book_id": book_id,
                "chapter_id": chapter_ids["three"],
                "scene_number": 3,
                "scene_type": "aftermath",
                "point_of_view_character_id": character_ids["elias"],
                "goal": "Survive without becoming property of the guilds.",
                "conflict": "Every system around him rewards compliance.",
                "outcome": "He keeps a small circle and keeps refusing.",
                "text_draft": "",
                "timeline_event_ids": ["event_digital_prison_2435_09", "event_digital_prison_2444_10", "event_digital_prison_2460_11", "event_digital_prison_2490_12", "event_digital_prison_2510_13"],
                "character_ids": [character_ids["elias"], character_ids["mara"], character_ids["rhoq"]],
                "location_ids": [location_ids["grid"], location_ids["arcade"], location_ids["district"], location_ids["colosseum"]],
                "plot_thread_ids": [plot_ids["guild_refusal"]],
                "created_at": seed_time,
                "updated_at": seed_time,
            },
        ],
    )

    timeline_rows = [
        ("event_digital_prison_2410_01", "Elias unveils the open replication mesh", "The old inventor demonstrates technology that can copy useful patterns without a licensing gate.", "At Civic Patent Hall, Elias Arden argues that the machines should belong to everyone.", "world_event", 2410, 1, 14, [character_ids["elias"]], [location_ids["hall"]], [faction_ids["human"]], [tech_ids["replication"]], [plot_ids["free_tech"]], [theme_ids["free_access"]]),
        ("event_digital_prison_2411_02", "Corporate analysts flag Elias for enforcement", "Helix Security starts treating the demonstration as an economic threat.", "Lena Voss begins reading his work as a profit opportunity.", "political", 2411, 3, 2, [character_ids["lena"], character_ids["elias"]], [location_ids["vault"]], [faction_ids["helix"], faction_ids["human"]], [tech_ids["replication"]], [plot_ids["free_tech"]], [theme_ids["cruelty"]]),
        ("event_digital_prison_2412_03", "Elias hacks the company archive", "He breaches the corporate software to release replication code to the public.", "The breach exposes the suppression architecture before the lockout closes.", "conflict", 2412, 5, 8, [character_ids["elias"]], [location_ids["vault"]], [faction_ids["helix"]], [tech_ids["replication"]], [plot_ids["free_tech"]], [theme_ids["free_access"], theme_ids["cruelty"]]),
        ("event_digital_prison_2413_04", "Elias is arrested and sentenced", "The federation treats the hack as sabotage against the economic order.", "The court sentence is made public to discourage anyone else from sharing tech freely.", "turning_point", 2413, 6, 1, [character_ids["elias"], character_ids["lena"]], [location_ids["hall"]], [faction_ids["human"], faction_ids["helix"]], [tech_ids["prison"]], [plot_ids["free_tech"], plot_ids["transfer"]], [theme_ids["cruelty"]]),
        ("event_digital_prison_2414_05", "His digital self enters the prison shell", "Elias is uploaded into a containment environment with time dilation.", "Inside the shell, pain and memory continue, but the body no longer belongs to him in any meaningful legal sense.", "aftermath", 2414, 2, 17, [character_ids["elias"]], [location_ids["grid"]], [faction_ids["human"]], [tech_ids["prison"]], [plot_ids["transfer"]], [theme_ids["identity"], theme_ids["cruelty"]]),
        ("event_digital_prison_2415_06", "Lena sells him across federation lines", "A security employee converts a human prisoner into a cross-federation transaction.", "Lena Voss pushes the transfer through to the Veyr federation and collects the side payment.", "political", 2415, 4, 9, [character_ids["lena"], character_ids["elias"]], [location_ids["vault"], location_ids["grid"]], [faction_ids["helix"], faction_ids["veyr"]], [tech_ids["prison"]], [plot_ids["transfer"]], [theme_ids["cruelty"]]),
        ("event_digital_prison_2416_07", "Elias wakes in the Veyr arena system", "The prisoner learns the new federation uses him as sports inventory.", "The first match is a gladiator trial watched like a broadcast, with failure meaning pain and reset.", "conflict", 2416, 1, 20, [character_ids["elias"], character_ids["rhoq"]], [location_ids["colosseum"]], [faction_ids["veyr"], faction_ids["guilds"]], [tech_ids["combat"]], [plot_ids["transfer"]], [theme_ids["cruelty"], theme_ids["identity"]]),
        ("event_digital_prison_2420_08", "A D-Day style assault lasts two simulated weeks", "The battle lattice forces prisoners into a brutal beach-landings scenario.", "A two-week battle can pass inside a single day of real time because of time dilation.", "world_event", 2420, 8, 4, [character_ids["elias"], character_ids["mara"]], [location_ids["colosseum"]], [faction_ids["veyr"], faction_ids["guilds"]], [tech_ids["combat"]], [plot_ids["transfer"]], [theme_ids["cruelty"], theme_ids["identity"]]),
        ("event_digital_prison_2435_09", "Training AI teachers keep him functional", "The prison assigns simple instructors to teach only what the next match requires.", "The teachers do not care about conversation or comfort; they only optimize his survival.", "discovery", 2435, 11, 12, [character_ids["elias"], character_ids["mara"]], [location_ids["grid"]], [faction_ids["veyr"]], [tech_ids["combat"], tech_ids["prison"]], [plot_ids["transfer"]], [theme_ids["identity"], theme_ids["detachment"]]),
        ("event_digital_prison_2444_10", "Guilds offer him a sponsor path", "His skill set attracts offers from prisoner guilds and betting syndicates.", "The guilds promise custom ability programs, better food, and temporary pleasures if he agrees to become a flagship fighter.", "political", 2444, 2, 27, [character_ids["elias"], character_ids["rhoq"]], [location_ids["arcade"]], [faction_ids["guilds"], faction_ids["veyr"]], [tech_ids["combat"]], [plot_ids["guild_refusal"]], [theme_ids["detachment"], theme_ids["cruelty"]]),
        ("event_digital_prison_2460_11", "He keeps a small circle and refuses every guild offer", "Elias builds a quiet clique of similar prisoners instead of joining a factional guild.", "The small group survives by staying low, learning the prison-city routes, and accepting that the system wants loyalty more than talent.", "aftermath", 2460, 7, 15, [character_ids["elias"], character_ids["mara"]], [location_ids["district"]], [faction_ids["veyr"]], [tech_ids["prison"]], [plot_ids["guild_refusal"]], [theme_ids["detachment"], theme_ids["identity"]]),
        ("event_digital_prison_2490_12", "The century mark changes nothing except his patience", "Elias reaches a hundred years of digital imprisonment and still refuses to perform for comfort.", "The prison has reshaped his priorities into something colder, but he still will not bargain with the state or the guilds.", "aftermath", 2490, 1, 1, [character_ids["elias"]], [location_ids["grid"]], [faction_ids["veyr"]], [tech_ids["prison"]], [plot_ids["guild_refusal"], plot_ids["transfer"]], [theme_ids["detachment"], theme_ids["identity"]]),
        ("event_digital_prison_2510_13", "Elias survives another cycle of the war games", "The old man endures while the system keeps cycling him through battles.", "By the time the century closes, he is no longer trying to win freedom in one dramatic act; he is simply still there.", "aftermath", 2510, 12, 31, [character_ids["elias"], character_ids["mara"]], [location_ids["colosseum"]], [faction_ids["veyr"], faction_ids["guilds"]], [tech_ids["combat"], tech_ids["prison"]], [plot_ids["transfer"], plot_ids["guild_refusal"]], [theme_ids["identity"], theme_ids["detachment"]]),
    ]

    timeline_docs = []
    for idx, (
        event_id,
        title,
        summary,
        description,
        event_type,
        year_start,
        month_start,
        day_start,
        character_list,
        location_list,
        faction_list,
        tech_list,
        plot_list,
        theme_list,
    ) in enumerate(timeline_rows):
        timeline_docs.append(
            {
                "id": event_id,
                "title": title,
                "summary": summary,
                "description": description,
                "status": "active",
                "tags": ["seed", "braindump-test", "digital-prison"],
                "is_archived": False,
                "canon_level": "core",
                "confidence": "high",
                "event_type": event_type,
                "year_start": year_start,
                "month_start": month_start,
                "day_start": day_start,
                "year_end": year_start,
                "month_end": month_start,
                "day_end": day_start,
                "chronology_order": idx + 1,
                "time_of_day_label": "all-day",
                "display_date_label": str(year_start),
                "era_id": era_id,
                "book_ids": [book_id],
                "chapter_ids": [chapter_ids["one"] if idx < 4 else chapter_ids["two"] if idx < 8 else chapter_ids["three"]],
                "scene_ids": [scene_ids["one"] if idx < 4 else scene_ids["two"] if idx < 8 else scene_ids["three"]],
                "character_ids": character_list,
                "location_ids": location_list,
                "faction_ids": faction_list,
                "culture_ids": [],
                "technology_ids": tech_list,
                "religion_ids": [],
                "plot_thread_ids": plot_list,
                "theme_ids": theme_list,
                "causes": [timeline_rows[idx - 1][0]] if idx > 0 else [],
                "consequences": [timeline_rows[idx + 1][0]] if idx < len(timeline_rows) - 1 else [],
                "predecessor_event_ids": [timeline_rows[idx - 1][0]] if idx > 0 else [],
                "successor_event_ids": [timeline_rows[idx + 1][0]] if idx < len(timeline_rows) - 1 else [],
                "public_wiki_summary": summary,
                "created_at": seed_time,
                "updated_at": seed_time,
            }
        )

    insert_many(conn, "timeline_events", timeline_docs)
    conn.commit()

    (PROJECT_DIR / "inbox" / "brain-dumps").mkdir(parents=True, exist_ok=True)
    write_text(
        PROJECT_DIR / "inbox" / "brain-dumps" / "digital-prison-braindump.md",
        """# Digital Prison Braindump

An old man in the future is arrested for trying to offer free replication technology to everyone. He hacks corporate software, gets caught, and is imprisoned in a digital prison. A government security employee sells his digital self to a different federation where prisoners are used in weekly sporting battles and alien war simulations. He spends a century in the prison city, cycles through gladiator fights, D-Day-style assaults, and alien battle scenarios, trains with simple AI teachers, avoids guild membership, and gradually becomes detached while keeping a small circle of similar prisoners.
""",
    )


def read_docs_for_exports(conn: sqlite3.Connection, table: str) -> list[dict]:
    rows = []
    for row in conn.execute(f'SELECT document_json FROM "{table}"'):
        rows.append(json.loads(row["document_json"]))
    return rows


def sort_timeline(rows: list[dict]) -> list[dict]:
    return sorted(
        rows,
        key=lambda row: (
            row.get("year_start") if row.get("year_start") is not None else 10**12,
            row.get("chronology_order") if row.get("chronology_order") is not None else 10**12,
            row.get("title") or row.get("id"),
        ),
    )


def export_markdown(path: Path, title: str, rows: list[dict]) -> None:
    lines = [f"# {title}", "", f"Total records: {len(rows)}", ""]
    for row in rows:
        label = row.get("title") or row.get("name") or row.get("term") or row.get("file_name") or row.get("id")
        lines.append(f"## {label}")
        lines.append(f"- ID: {row.get('id')}")
        if row.get("summary"):
            lines.append(f"- Summary: {row['summary']}")
        if row.get("status"):
            lines.append(f"- Status: {row['status']}")
        lines.append("")
    write_text(path, "\n".join(lines))


def generate_exports(conn: sqlite3.Connection) -> None:
    export_root = PROJECT_DIR / "exports"
    canon_root = export_root / "canon"
    manuscript_root = export_root / "manuscript"
    timeline_root = export_root / "timeline"
    indexes_root = export_root / "indexes"
    for d in [canon_root, manuscript_root, timeline_root, indexes_root]:
        ensure_dir(d)

    all_docs = {}
    for table in TABLES:
        if table == "projects":
            continue
        docs = read_docs_for_exports(conn, table)
        all_docs[table] = docs
        write_json(canon_root / f"{table}.json", docs)
        export_markdown(canon_root / f"{table}.md", table, docs)

    books = all_docs.get("books", [])
    write_json(manuscript_root / "books.json", books)
    export_markdown(manuscript_root / "Books.md", "Books", books)

    timeline = sort_timeline(all_docs.get("timeline_events", []))
    write_json(timeline_root / "chronology.json", timeline)
    export_markdown(timeline_root / "chronology.md", "Timeline", timeline)

    entity_index = [{"slice": table, "count": len(rows)} for table, rows in all_docs.items()]
    write_json(indexes_root / "entity-index.json", entity_index)
    export_markdown(indexes_root / "entity-index.md", "Entity Index", entity_index)


def main() -> None:
    for project_name in SANDBOX_PROJECTS:
        remove_tree_inside_projects_root(PROJECTS_ROOT / project_name)
    remove_tree_inside_projects_root(PROJECT_DIR)

    build_project_scaffold()
    conn = open_db()
    try:
        seed(conn)
        generate_exports(conn)
    finally:
        conn.close()

    settings = {}
    if APP_SETTINGS_PATH.exists():
        settings = json.loads(APP_SETTINGS_PATH.read_text(encoding="utf-8"))

    recent_projects = []
    for recent in settings.get("recentProjects", []):
        base = Path(recent.get("path", "")).name.lower()
        if base in {"the-tribute", "this-is-a-tribute"}:
            recent_projects.append(recent)

    if not any(Path(item.get("path", "")).name.lower() == PROJECT_ID for item in recent_projects):
        recent_projects.insert(
            0,
            {
                "id": PROJECT_ID,
                "title": PROJECT_TITLE,
                "path": str(PROJECT_DIR),
                "lastOpenedAt": iso_now(),
            },
        )
    else:
        recent_projects = [
            item for item in recent_projects if Path(item.get("path", "")).name.lower() != PROJECT_ID
        ]
        recent_projects.insert(
            0,
            {
                "id": PROJECT_ID,
                "title": PROJECT_TITLE,
                "path": str(PROJECT_DIR),
                "lastOpenedAt": iso_now(),
            },
        )

    if not any(Path(item.get("path", "")).name.lower() == "the-tribute" for item in recent_projects):
        recent_projects.append(
            {
                "id": "the-tribute",
                "title": "The Tribute",
                "path": str(PROJECTS_ROOT / "the-tribute"),
            }
        )

    if not any(Path(item.get("path", "")).name.lower() == "this-is-a-tribute" for item in recent_projects):
        recent_projects.append(
            {
                "id": "this-is-a-tribute",
                "title": "this-is-a-tribute",
                "path": str(PROJECTS_ROOT / "this-is-a-tribute"),
            }
        )

    settings["currentProjectPath"] = str(PROJECT_DIR)
    settings["currentProjectId"] = PROJECT_ID
    settings["recentProjects"] = recent_projects
    APP_DATA_ROOT.mkdir(parents=True, exist_ok=True)
    APP_SETTINGS_PATH.write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "projectDir": str(PROJECT_DIR),
        "deletedSandboxes": SANDBOX_PROJECTS,
        "currentProjectPath": settings["currentProjectPath"],
        "recentProjects": [item.get("path") for item in recent_projects],
    }, indent=2))


if __name__ == "__main__":
    main()
