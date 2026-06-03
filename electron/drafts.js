const fs = require("fs");
const path = require("path");

const {
  getSingleDocument,
  runInTransaction,
  storeDocument,
} = require("./database");
const { generateExports } = require("./exports");
const { applyFieldPatch, slugify } = require("../lib/drafts/apply-helpers");
const { parseDraftText } = require("../lib/drafts/schema");

const DRAFT_STATUS_DIRECTORIES = {
  applied: "applied",
  approved: "approved",
  "pending-review": "pending",
  rejected: "rejected",
};

const PRIMARY_FIELD_BY_TABLE = {
  attachments: "title",
  books: "title",
  chapters: "title",
  characters: "name",
  cultures: "name",
  eras: "name",
  factions: "name",
  glossary_terms: "term",
  governments: "name",
  items: "name",
  languages: "name",
  locations: "name",
  notes: "title",
  organizations: "name",
  outlines: "title",
  plot_threads: "title",
  relationships: "title",
  religions: "name",
  retcons: "title",
  scenes: "title",
  species: "name",
  technologies: "name",
  themes: "name",
  timeline_events: "title",
};

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function getDraftsRoot(projectRuntime) {
  return path.join(projectRuntime.projectPath, "proposals");
}

function getDraftStatusDirectory(projectRuntime, status) {
  const directoryName = DRAFT_STATUS_DIRECTORIES[status] ?? "pending";
  return path.join(getDraftsRoot(projectRuntime), directoryName);
}

function listDraftFiles(projectRuntime) {
  return Object.values(DRAFT_STATUS_DIRECTORIES)
    .map((directoryName) => path.join(getDraftsRoot(projectRuntime), directoryName))
    .filter((directoryPath) => fs.existsSync(directoryPath))
    .flatMap((directoryPath) =>
      fs
        .readdirSync(directoryPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
        .map((entry) => path.join(directoryPath, entry.name))
    );
}

function encodeDraftId(relativePath) {
  return Buffer.from(relativePath, "utf8").toString("base64url");
}

function decodeDraftId(draftId) {
  return Buffer.from(draftId, "base64url").toString("utf8");
}

function resolveRelativeDraftPath(projectRuntime, absolutePath) {
  return path.relative(projectRuntime.projectPath, absolutePath).replace(/\\/g, "/");
}

function getDraftDirStatus(relativePath) {
  if (relativePath.startsWith("proposals/approved/")) {
    return "approved";
  }

  if (relativePath.startsWith("proposals/rejected/")) {
    return "rejected";
  }

  if (relativePath.startsWith("proposals/applied/")) {
    return "applied";
  }

  return "pending-review";
}

function readDraftFile(projectRuntime, absolutePath) {
  const relativePath = resolveRelativeDraftPath(projectRuntime, absolutePath);
  const rawText = fs.readFileSync(absolutePath, "utf8");
  const parsed = parseDraftText(rawText, projectRuntime.projectId);
  const draft = parsed.draft;

  return {
    createdAt: typeof draft?.createdAt === "string" ? draft.createdAt : null,
    draft,
    draftId: encodeDraftId(relativePath),
    errors: parsed.errors,
    fileName: path.basename(absolutePath),
    projectId: typeof draft?.projectId === "string" ? draft.projectId : null,
    proposedChangeCount: Array.isArray(draft?.proposedChanges) ? draft.proposedChanges.length : 0,
    rawText,
    relativePath,
    sourceFile: typeof draft?.sourceFile === "string" ? draft.sourceFile : null,
    status:
      typeof draft?.status === "string" && draft.status.trim()
        ? draft.status
        : getDraftDirStatus(relativePath),
    summary:
      typeof draft?.summary === "string" && draft.summary.trim()
        ? draft.summary
        : path.basename(absolutePath),
    valid: parsed.valid,
  };
}

function listDrafts(projectRuntime) {
  return listDraftFiles(projectRuntime)
    .map((absolutePath) => readDraftFile(projectRuntime, absolutePath))
    .sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    })
    .map(({ rawText: _rawText, relativePath: _relativePath, draft: _draft, ...draftSummary }) => draftSummary);
}

function getDraftById(projectRuntime, draftId) {
  const relativePath = decodeDraftId(draftId);
  const absolutePath = path.join(projectRuntime.projectPath, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return readDraftFile(projectRuntime, absolutePath);
}

function writeDraftText(projectRuntime, draftId, rawText) {
  const relativePath = decodeDraftId(draftId);
  const absolutePath = path.join(projectRuntime.projectPath, relativePath);

  fs.writeFileSync(absolutePath, rawText, "utf8");
  return getDraftById(projectRuntime, draftId);
}

function writeDraftObject(projectRuntime, absolutePath, draft) {
  fs.writeFileSync(absolutePath, JSON.stringify(draft, null, 2) + "\n", "utf8");
}

function moveDraftToStatus(projectRuntime, draftId, nextStatus) {
  const currentDraft = getDraftById(projectRuntime, draftId);

  if (!currentDraft) {
    throw new Error("Draft file not found.");
  }

  if (!currentDraft.valid || !currentDraft.draft) {
    throw new Error("Draft JSON must be valid before changing review status.");
  }

  const currentAbsolutePath = path.join(projectRuntime.projectPath, currentDraft.relativePath);
  const nextDirectory = getDraftStatusDirectory(projectRuntime, nextStatus);
  const nextAbsolutePath = path.join(nextDirectory, currentDraft.fileName);
  const nextDraft = {
    ...currentDraft.draft,
    status: nextStatus,
  };

  ensureDirectory(nextDirectory);
  writeDraftObject(projectRuntime, currentAbsolutePath, nextDraft);

  if (currentAbsolutePath !== nextAbsolutePath) {
    if (fs.existsSync(nextAbsolutePath)) {
      fs.unlinkSync(nextAbsolutePath);
    }

    fs.renameSync(currentAbsolutePath, nextAbsolutePath);
  }

  return getDraftById(
    projectRuntime,
    encodeDraftId(resolveRelativeDraftPath(projectRuntime, nextAbsolutePath))
  );
}

function buildDefaultRecord(tableName, targetId, projectId) {
  const now = new Date().toISOString();
  const primaryField = PRIMARY_FIELD_BY_TABLE[tableName];
  const defaultRecord = {
    id: targetId,
    slug: slugify(targetId) || targetId,
    summary: "",
    description: "",
    status: "active",
    tags: [],
    is_archived: false,
    canon_level: "working",
    confidence: "medium",
    created_at: now,
    updated_at: now,
    project_id: projectId,
  };

  if (primaryField) {
    defaultRecord[primaryField] = targetId;
  }

  return defaultRecord;
}

function normalizeTableName(slice) {
  return String(slice ?? "").trim().replace(/-/g, "_");
}

function getRecordForChange(projectRuntime, tableName, change) {
  const existingRecord = getSingleDocument(projectRuntime.db, tableName, projectRuntime.projectId, [
    { field: "id", operator: "eq", value: change.targetId },
  ]);

  if (change.action === "create") {
    if (existingRecord) {
      throw new Error(
        `Cannot create ${tableName}:${change.targetId} because it already exists.`
      );
    }

    return buildDefaultRecord(tableName, change.targetId, projectRuntime.projectId);
  }

  if (!existingRecord) {
    throw new Error(`Cannot ${change.action} ${tableName}:${change.targetId} because it does not exist.`);
  }

  return existingRecord;
}

function applyDraftChange(projectRuntime, change) {
  const tableName = normalizeTableName(change.slice);
  const baseRecord = getRecordForChange(projectRuntime, tableName, change);
  const nextRecord = applyFieldPatch(baseRecord, change.fields, change.action);

  storeDocument(
    projectRuntime.db,
    tableName,
    {
      ...nextRecord,
      id: change.targetId,
      updated_at: new Date().toISOString(),
    },
    projectRuntime.projectId
  );
}

function applyDraft(projectRuntime, draftId) {
  const currentDraft = getDraftById(projectRuntime, draftId);

  if (!currentDraft) {
    throw new Error("Draft file not found.");
  }

  if (!currentDraft.valid || !currentDraft.draft) {
    throw new Error("Draft JSON must be valid before apply.");
  }

  if (currentDraft.draft.status !== "approved") {
    throw new Error("Draft must be approved before apply.");
  }

  runInTransaction(projectRuntime.db, () => {
    currentDraft.draft.proposedChanges.forEach((change) => {
      applyDraftChange(projectRuntime, change);
    });
  });

  generateExports(projectRuntime);
  return moveDraftToStatus(projectRuntime, draftId, "applied");
}

module.exports = {
  applyDraft,
  getDraftById,
  listDrafts,
  moveDraftToStatus,
  writeDraftText,
};
