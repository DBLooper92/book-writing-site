const BetterSqlite3 = require("better-sqlite3");

const { slugify } = require("../lib/drafts/apply-helpers");

const LOCAL_USER_ID = "local-desktop";
const DOCUMENT_TABLES = [
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
];

function openProjectDatabase(databasePath) {
  const db = new BetterSqlite3(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureDatabaseSchema(db);
  return db;
}

function ensureDatabaseSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );
  `);

  DOCUMENT_TABLES.forEach((tableName) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id TEXT PRIMARY KEY,
        slug TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        document_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_${tableName}_slug" ON "${tableName}" (slug);
      CREATE INDEX IF NOT EXISTS "idx_${tableName}_updated_at" ON "${tableName}" (updated_at);
    `);
  });
}

function stripScopeFields(record) {
  const nextRecord = { ...(record ?? {}) };
  delete nextRecord.user_id;
  delete nextRecord.project_id;
  delete nextRecord.owner_id;
  return nextRecord;
}

function parseStoredDocument(row, projectId) {
  const parsedDocument = row?.document_json ? JSON.parse(row.document_json) : {};

  return {
    ...parsedDocument,
    id: parsedDocument.id ?? row.id,
    slug: parsedDocument.slug ?? row.slug ?? null,
    created_at: parsedDocument.created_at ?? row.created_at,
    updated_at: parsedDocument.updated_at ?? row.updated_at,
    user_id: LOCAL_USER_ID,
    owner_id: LOCAL_USER_ID,
    project_id: projectId,
  };
}

function pickColumns(document, columns) {
  if (!columns || columns === "*") {
    return document;
  }

  const selectedColumns = columns
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean);
  const pickedDocument = {};

  selectedColumns.forEach((column) => {
    pickedDocument[column] = document[column] ?? null;
  });

  return pickedDocument;
}

function compareScalarValues(leftValue, rightValue) {
  if (leftValue === rightValue) {
    return 0;
  }

  if (leftValue === null || leftValue === undefined) {
    return 1;
  }

  if (rightValue === null || rightValue === undefined) {
    return -1;
  }

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return leftValue - rightValue;
  }

  return String(leftValue).localeCompare(String(rightValue));
}

function matchesFilter(document, filter) {
  const currentValue = document[filter.field];

  if (filter.operator === "eq") {
    return currentValue === filter.value;
  }

  if (filter.operator === "in") {
    return Array.isArray(filter.value) && filter.value.includes(currentValue);
  }

  return true;
}

function readAllDocuments(db, tableName, projectId) {
  const rows = db
    .prepare(
      `SELECT id, slug, created_at, updated_at, document_json FROM "${tableName}"`
    )
    .all();

  return rows.map((row) => parseStoredDocument(row, projectId));
}

function queryDocuments(db, tableName, projectId, query = {}) {
  const filters = Array.isArray(query.filters) ? query.filters : [];
  const documents = readAllDocuments(db, tableName, projectId)
    .filter((document) => filters.every((filter) => matchesFilter(document, filter)))
    .sort((leftDocument, rightDocument) => {
      if (!query.order?.column) {
        return 0;
      }

      const comparison = compareScalarValues(
        leftDocument[query.order.column],
        rightDocument[query.order.column]
      );

      return query.order.ascending === false ? comparison * -1 : comparison;
    });

  return documents.map((document) => pickColumns(document, query.columns));
}

function deriveSlug(values) {
  const candidate =
    values.slug ||
    values.title ||
    values.name ||
    values.term ||
    values.file_name ||
    values.id;

  return slugify(candidate) || String(values.id ?? "");
}

function storeDocument(db, tableName, values, projectId) {
  const document = stripScopeFields(values);

  if (!document.id) {
    throw new Error(`Cannot store a ${tableName} record without an id.`);
  }

  const now = document.updated_at || new Date().toISOString();
  const createdAt = document.created_at || now;
  const storedDocument = {
    ...document,
    id: String(document.id),
    slug: deriveSlug(document),
    created_at: createdAt,
    updated_at: now,
  };

  db.prepare(
    `INSERT OR REPLACE INTO "${tableName}" (id, slug, created_at, updated_at, document_json)
     VALUES (@id, @slug, @created_at, @updated_at, @document_json)`
  ).run({
    id: storedDocument.id,
    slug: storedDocument.slug || null,
    created_at: storedDocument.created_at,
    updated_at: storedDocument.updated_at,
    document_json: JSON.stringify(stripScopeFields(storedDocument)),
  });

  return {
    ...storedDocument,
    project_id: projectId,
    user_id: LOCAL_USER_ID,
    owner_id: LOCAL_USER_ID,
  };
}

function insertDocuments(db, tableName, projectId, values) {
  const batch = Array.isArray(values) ? values : [values];
  return batch.map((value) => storeDocument(db, tableName, value, projectId));
}

function updateDocuments(db, tableName, projectId, values, filters = []) {
  const patch = stripScopeFields(values);
  const documents = readAllDocuments(db, tableName, projectId).filter((document) =>
    filters.every((filter) => matchesFilter(document, filter))
  );

  return documents.map((document) =>
    storeDocument(
      db,
      tableName,
      {
        ...document,
        ...patch,
        id: document.id,
        created_at: document.created_at,
        updated_at: patch.updated_at || new Date().toISOString(),
      },
      projectId
    )
  );
}

function deleteDocuments(db, tableName, projectId, filters = []) {
  const documents = readAllDocuments(db, tableName, projectId).filter((document) =>
    filters.every((filter) => matchesFilter(document, filter))
  );
  const deleteStatement = db.prepare(`DELETE FROM "${tableName}" WHERE id = ?`);

  documents.forEach((document) => {
    deleteStatement.run(document.id);
  });

  return documents;
}

function getSingleDocument(db, tableName, projectId, filters = []) {
  return (
    readAllDocuments(db, tableName, projectId).find((document) =>
      filters.every((filter) => matchesFilter(document, filter))
    ) ?? null
  );
}

function setMeta(db, key, value) {
  db.prepare(
    `INSERT OR REPLACE INTO _meta (key, value_json) VALUES (?, ?)`
  ).run(key, JSON.stringify(value));
}

function getMeta(db, key) {
  const row = db.prepare(`SELECT value_json FROM _meta WHERE key = ?`).get(key);

  if (!row) {
    return null;
  }

  return JSON.parse(row.value_json);
}

function runInTransaction(db, callback) {
  return db.transaction(callback)();
}

module.exports = {
  DOCUMENT_TABLES,
  LOCAL_USER_ID,
  deleteDocuments,
  ensureDatabaseSchema,
  getMeta,
  getSingleDocument,
  insertDocuments,
  openProjectDatabase,
  queryDocuments,
  readAllDocuments,
  runInTransaction,
  setMeta,
  storeDocument,
  stripScopeFields,
  updateDocuments,
};
