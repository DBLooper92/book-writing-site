const fs = require("fs");
const path = require("path");

const { DOCUMENT_TABLES, queryDocuments, setMeta } = require("./database");

function ensureDir(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function resolvePrimaryLabel(document) {
  return (
    document.title ||
    document.name ||
    document.term ||
    document.file_name ||
    document.id
  );
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeMarkdownFile(filePath, title, documents) {
  const lines = [`# ${title}`, "", `Total records: ${documents.length}`, ""];

  documents.forEach((document) => {
    lines.push(`## ${resolvePrimaryLabel(document)}`);
    lines.push(`- ID: ${document.id}`);

    if (document.summary) {
      lines.push(`- Summary: ${document.summary}`);
    }

    if (document.status) {
      lines.push(`- Status: ${document.status}`);
    }

    lines.push("");
  });

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

function sortTimelineDocuments(documents) {
  return [...documents].sort((left, right) => {
    const leftYear = left.year_start ?? left.year_end ?? Number.MAX_SAFE_INTEGER;
    const rightYear = right.year_start ?? right.year_end ?? Number.MAX_SAFE_INTEGER;

    if (leftYear !== rightYear) {
      return leftYear - rightYear;
    }

    return resolvePrimaryLabel(left).localeCompare(resolvePrimaryLabel(right));
  });
}

function generateExports(projectRuntime) {
  const exportRoot = path.join(projectRuntime.projectPath, "exports");
  const canonRoot = path.join(exportRoot, "canon");
  const manuscriptRoot = path.join(exportRoot, "manuscript");
  const timelineRoot = path.join(exportRoot, "timeline");
  const indexesRoot = path.join(exportRoot, "indexes");

  [canonRoot, manuscriptRoot, timelineRoot, indexesRoot].forEach(ensureDir);

  const allDocumentsByTable = {};

  DOCUMENT_TABLES.filter((tableName) => tableName !== "projects").forEach((tableName) => {
    allDocumentsByTable[tableName] = queryDocuments(
      projectRuntime.db,
      tableName,
      projectRuntime.projectId,
      {
        columns: "*",
      }
    );
  });

  Object.entries(allDocumentsByTable).forEach(([tableName, documents]) => {
    writeJsonFile(path.join(canonRoot, `${tableName}.json`), documents);
    writeMarkdownFile(path.join(canonRoot, `${tableName}.md`), tableName, documents);
  });

  const books = allDocumentsByTable.books ?? [];
  writeJsonFile(path.join(manuscriptRoot, "books.json"), books);
  writeMarkdownFile(path.join(manuscriptRoot, "Books.md"), "Books", books);

  const timelineEvents = sortTimelineDocuments(allDocumentsByTable.timeline_events ?? []);
  writeJsonFile(path.join(timelineRoot, "chronology.json"), timelineEvents);
  writeMarkdownFile(path.join(timelineRoot, "chronology.md"), "Timeline", timelineEvents);

  const entityIndex = Object.entries(allDocumentsByTable).map(([tableName, documents]) => ({
    slice: tableName,
    count: documents.length,
  }));
  writeJsonFile(path.join(indexesRoot, "entity-index.json"), entityIndex);
  writeMarkdownFile(path.join(indexesRoot, "entity-index.md"), "Entity Index", entityIndex);

  setMeta(projectRuntime.db, "last_export_at", new Date().toISOString());
}

module.exports = {
  generateExports,
};
