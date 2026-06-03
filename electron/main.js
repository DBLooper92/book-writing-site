const fs = require("fs");
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  safeStorage,
  shell,
} = require("electron");
const chokidar = require("chokidar");

const {
  getMeta,
  getSingleDocument,
  insertDocuments,
  openProjectDatabase,
  queryDocuments,
  readAllDocuments,
  updateDocuments,
  deleteDocuments,
} = require("./database");
const { applyDraft, getDraftById, listDrafts, moveDraftToStatus, writeDraftText } = require("./drafts");
const { generateExports } = require("./exports");
const { ensureProjectScaffold } = require("./templates");
const {
  createKeyFingerprint,
  getActiveOpenAiKey,
  getOpenAiKeyRecordByFingerprint,
  getOpenAiUsageDashboard,
  hasOpenAiKeys,
  listOpenAiKeys,
  recordOpenAiUsage,
  removeOpenAiKey: removeStoredOpenAiKey,
  setActiveOpenAiKey: setStoredActiveOpenAiKey,
  upsertOpenAiKey,
} = require("./openai-store");
const {
  buildMultiTimelineBrainDumpSystemPrompt,
  buildMultiTimelineBrainDumpUserPrompt,
  splitTextIntoChunks,
  buildTimelineBrainDumpSystemPrompt,
  buildTimelineBrainDumpUserPrompt,
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  extractFirstJsonObject,
  extractOpenAiResponseText,
} = require("./ai-utils");
const { buildValidationFixtures } = require("./brain-dump-validation-fixtures");
const { slugify } = require("../lib/drafts/apply-helpers");

const APP_PROTOCOL = "bookbible-file";
const APP_SETTINGS_FILE = "app-settings.json";
const DEFAULT_PROJECTS_ROOT = path.join(os.homedir(), "Documents", "BookWritingProjects");
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_DEFAULT_RETRY_COUNT = 3;
const OPENAI_DEFAULT_RETRY_DELAY_MS = 1000;
const OPENAI_DEFAULT_TIMEOUT_MS = 90000;
const OPENAI_MAX_TIMEOUT_MS = 240000;
const MULTI_BRAIN_DUMP_MAX_CHARS = 3600;
const RUN_VALIDATION_SUITE_CLI = process.argv.includes("--run-validation-suite");
const RUN_DIGITAL_PRISON_BRAIN_DUMP_CLI = process.argv.includes(
  "--run-digital-prison-brain-dumps"
);

const RUN_DIGITAL_PRISON_UI_CLI = process.env.BOOK_BIBLE_RUN_DIGITAL_PRISON_UI === "1";

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      corsEnabled: true,
      secure: true,
      standard: true,
      stream: true,
      supportFetchAPI: true,
    },
  },
]);

let mainWindow = null;
let currentProjectRuntime = null;
let draftsWatcher = null;
let rendererServer = null;
let rendererUrlPromise = null;
const aiJobRuntimeById = new Map();

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function getSettingsPath() {
  ensureDirectory(app.getPath("userData"));
  return path.join(app.getPath("userData"), APP_SETTINGS_FILE);
}

function createDefaultAppSettings() {
  return {
    currentProjectPath: null,
    recentProjects: [],
    windowBounds: null,
    ai: {
      openai: {
        apiKeyEncrypted: null,
        apiKeyLast4: null,
        defaultModel: DEFAULT_OPENAI_MODEL,
        updatedAt: null,
      },
    },
  };
}

function normalizeAppSettings(settings) {
  const defaults = createDefaultAppSettings();
  const openAiSettings = {
    ...defaults.ai.openai,
    ...(settings?.ai?.openai ?? {}),
  };

  return {
    ...defaults,
    ...(settings ?? {}),
    ai: {
      openai: {
        apiKeyEncrypted:
          typeof openAiSettings.apiKeyEncrypted === "string"
            ? openAiSettings.apiKeyEncrypted
            : null,
        apiKeyLast4:
          typeof openAiSettings.apiKeyLast4 === "string" ? openAiSettings.apiKeyLast4 : null,
        defaultModel:
          typeof openAiSettings.defaultModel === "string" && openAiSettings.defaultModel.trim()
            ? openAiSettings.defaultModel.trim()
            : DEFAULT_OPENAI_MODEL,
        updatedAt: typeof openAiSettings.updatedAt === "string" ? openAiSettings.updatedAt : null,
      },
    },
  };
}

function getEnvironmentOpenAiApiKey() {
  const rawValue = process.env.OPENAI_API_KEY ?? process.env.BOOK_BIBLE_OPENAI_API_KEY;

  if (typeof rawValue !== "string") {
    return null;
  }

  const trimmed = rawValue.trim();
  return trimmed ? trimmed : null;
}

function readAppSettings() {
  const settingsPath = getSettingsPath();

  if (!fs.existsSync(settingsPath)) {
    return createDefaultAppSettings();
  }

  try {
    return normalizeAppSettings(JSON.parse(fs.readFileSync(settingsPath, "utf8")));
  } catch {
    return createDefaultAppSettings();
  }
}

function writeAppSettings(nextSettings) {
  const normalizedSettings = normalizeAppSettings(nextSettings);
  fs.writeFileSync(getSettingsPath(), JSON.stringify(normalizedSettings, null, 2) + "\n", "utf8");
}

function updateAppSettings(updater) {
  const currentSettings = readAppSettings();
  const nextSettings = updater(currentSettings);
  writeAppSettings(nextSettings);
  return nextSettings;
}

function sendRendererEvent(channelName) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channelName);
}

function getDefaultProjectsRoot() {
  ensureDirectory(DEFAULT_PROJECTS_ROOT);
  return DEFAULT_PROJECTS_ROOT;
}

function buildProjectFolderSlug(baseTitle) {
  return slugify(baseTitle) || "project";
}

function getUniqueProjectFolderPath(title) {
  const rootDirectory = getDefaultProjectsRoot();
  const baseSlug = buildProjectFolderSlug(title);
  let candidateSlug = baseSlug;
  let suffix = 2;

  while (fs.existsSync(path.join(rootDirectory, candidateSlug))) {
    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return {
    projectPath: path.join(rootDirectory, candidateSlug),
    slug: candidateSlug,
  };
}

function readProjectManifest(projectPath) {
  const manifestPath = path.join(projectPath, "project.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error("The selected folder is missing project.json.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  if (!manifest?.id || !manifest?.slug || !manifest?.title) {
    throw new Error("project.json is missing one of: id, slug, title.");
  }

  return manifest;
}

function writeProjectManifest(projectPath, manifest) {
  fs.writeFileSync(
    path.join(projectPath, "project.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  );
}

function buildDefaultProjectRecord(manifest) {
  const now = new Date().toISOString();

  return {
    id: manifest.id,
    title: manifest.title,
    slug: manifest.slug,
    summary: `Story bible project for ${manifest.title}.`,
    description: `Local-first writing workspace for ${manifest.title}.`,
    genre: "Unassigned",
    tone: "Undecided",
    themes: [],
    timeline_start_year: null,
    timeline_end_year: null,
    default_calendar_system_id: "calendar_standard_solar",
    primary_point_of_view_style: "Undecided",
    writing_status: "planning",
    book_order_mode: "series-order",
    notes_root_id: null,
    settings: {
      allowPublicWiki: false,
      allowAIWriting: false,
      allowAIEditing: false,
      defaultTimelineScale: "year",
      defaultLanguageId: null,
      spoilerPolicy: "internal-only",
    },
    status: "active",
    created_at: manifest.createdAt || now,
    updated_at: now,
  };
}

function ensureProjectRecord(projectRuntime) {
  const existingRecord = getSingleDocument(
    projectRuntime.db,
    "projects",
    projectRuntime.projectId,
    [{ field: "id", operator: "eq", value: projectRuntime.projectId }]
  );

  if (existingRecord) {
    return existingRecord;
  }

  const defaultRecord = buildDefaultProjectRecord(projectRuntime.manifest);
  return insertDocuments(projectRuntime.db, "projects", projectRuntime.projectId, defaultRecord)[0];
}

function serializeCurrentProject(projectRuntime) {
  if (!projectRuntime) {
    return null;
  }

  const projectRecord = ensureProjectRecord(projectRuntime);

  return {
    id: projectRuntime.projectId,
    title: projectRuntime.manifest.title,
    slug: projectRuntime.manifest.slug,
    path: projectRuntime.projectPath,
    manifest: projectRuntime.manifest,
    projectRecord,
    folders: {
      attachments: path.join(projectRuntime.projectPath, "attachments"),
      exports: path.join(projectRuntime.projectPath, "exports"),
      inbox: path.join(projectRuntime.projectPath, "inbox"),
      prompts: path.join(projectRuntime.projectPath, "prompts"),
      proposals: path.join(projectRuntime.projectPath, "proposals"),
    },
  };
}

function toRecentProject(projectPath) {
  try {
    const manifest = readProjectManifest(projectPath);
    const settings = readAppSettings();
    const existingRecent = Array.isArray(settings.recentProjects)
      ? settings.recentProjects.find((recentProject) => recentProject.path === projectPath)
      : null;

    return {
      id: manifest.id,
      title: manifest.title,
      path: projectPath,
      lastOpenedAt: existingRecent?.lastOpenedAt ?? manifest.createdAt ?? new Date().toISOString(),
      missing: false,
    };
  } catch {
    const settings = readAppSettings();
    const existingRecent = Array.isArray(settings.recentProjects)
      ? settings.recentProjects.find((recentProject) => recentProject.path === projectPath)
      : null;

    return {
      id: existingRecent?.id ?? path.basename(projectPath),
      title: existingRecent?.title ?? path.basename(projectPath),
      path: projectPath,
      lastOpenedAt: existingRecent?.lastOpenedAt ?? new Date(0).toISOString(),
      missing: true,
    };
  }
}

function listRecentProjects() {
  const settings = readAppSettings();
  const recentProjects = Array.isArray(settings.recentProjects) ? settings.recentProjects : [];

  return recentProjects
    .map((recentProject) => toRecentProject(recentProject.path))
    .sort((left, right) => Date.parse(right.lastOpenedAt) - Date.parse(left.lastOpenedAt));
}

function rememberRecentProject(projectRuntime) {
  const lastOpenedAt = new Date().toISOString();

  updateAppSettings((settings) => {
    const recentProjects = Array.isArray(settings.recentProjects) ? settings.recentProjects : [];
    const nextRecents = [
      {
        id: projectRuntime.projectId,
        title: projectRuntime.manifest.title,
        path: projectRuntime.projectPath,
        lastOpenedAt,
      },
      ...recentProjects.filter((recentProject) => recentProject.path !== projectRuntime.projectPath),
    ].slice(0, 20);

    return {
      ...settings,
      currentProjectPath: projectRuntime.projectPath,
      recentProjects: nextRecents,
    };
  });
}

function clearCurrentProjectSetting() {
  updateAppSettings((settings) => ({
    ...settings,
    currentProjectPath: null,
  }));
}

function stopDraftsWatcher() {
  if (!draftsWatcher) {
    return;
  }

  draftsWatcher.close();
  draftsWatcher = null;
}

function startDraftsWatcher(projectRuntime) {
  stopDraftsWatcher();

  const proposalsRoot = path.join(projectRuntime.projectPath, "proposals");
  draftsWatcher = chokidar.watch(proposalsRoot, {
    ignoreInitial: true,
    persistent: true,
  });

  const notify = () => {
    sendRendererEvent("drafts:changed");
  };

  draftsWatcher.on("add", notify);
  draftsWatcher.on("change", notify);
  draftsWatcher.on("unlink", notify);
}

function closeCurrentProject() {
  stopDraftsWatcher();

  if (currentProjectRuntime?.db) {
    currentProjectRuntime.db.close();
  }

  currentProjectRuntime = null;
  clearCurrentProjectSetting();
  sendRendererEvent("project:changed");
}

function openProjectAtPath(projectPath) {
  console.log(`[book-bible] openProjectAtPath:start ${projectPath}`);
  const manifest = readProjectManifest(projectPath);

  ensureProjectScaffold({
    projectRoot: projectPath,
    projectId: manifest.id,
    projectSlug: manifest.slug,
    title: manifest.title,
  });

  const databasePath = path.join(projectPath, "data", "project.sqlite");
  ensureDirectory(path.dirname(databasePath));

  stopDraftsWatcher();

  if (currentProjectRuntime?.db) {
    currentProjectRuntime.db.close();
  }

  const projectRuntime = {
    db: openProjectDatabase(databasePath),
    manifest: readProjectManifest(projectPath),
    projectId: manifest.id,
    projectPath,
  };

  projectRuntime.manifest = readProjectManifest(projectPath);

  currentProjectRuntime = projectRuntime;
  ensureProjectRecord(projectRuntime);
  markStaleJobs(projectRuntime);
  generateExports(projectRuntime);
  rememberRecentProject(projectRuntime);
  startDraftsWatcher(projectRuntime);
  sendRendererEvent("project:changed");
  sendRendererEvent("drafts:changed");
  console.log(`[book-bible] openProjectAtPath:done ${projectPath}`);
  return serializeCurrentProject(projectRuntime);
}

function createProject({ title }) {
  const normalizedTitle = String(title ?? "").trim();

  if (!normalizedTitle) {
    throw new Error("Enter a project name.");
  }

  const { projectPath, slug } = getUniqueProjectFolderPath(normalizedTitle);
  ensureDirectory(projectPath);

  ensureProjectScaffold({
    projectRoot: projectPath,
    projectId: slug,
    projectSlug: slug,
    title: normalizedTitle,
  });

  return openProjectAtPath(projectPath);
}

function ensureCurrentProjectRuntime() {
  if (!currentProjectRuntime) {
    throw new Error("No project is currently open.");
  }

  return currentProjectRuntime;
}

function resolveStorageRoot(projectRuntime, bucketId) {
  if (bucketId === "entity-images") {
    return path.join(projectRuntime.projectPath, "attachments", "images");
  }

  if (bucketId === "project-documents") {
    return path.join(projectRuntime.projectPath, "attachments", "documents");
  }

  throw new Error(`Unsupported attachment bucket: ${bucketId}`);
}

function resolveStorageAbsolutePath(projectRuntime, bucketId, storagePath) {
  const storageRoot = path.resolve(resolveStorageRoot(projectRuntime, bucketId));
  const absolutePath = path.resolve(storageRoot, storagePath);

  if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Attachment path resolves outside the project storage directory.");
  }

  return absolutePath;
}

function createAttachmentPreviewUrl(bucketId, storagePath) {
  return `${APP_PROTOCOL}://preview/${encodeURIComponent(bucketId)}/${encodeURIComponent(storagePath)}`;
}

async function ensureRendererUrl() {
  if (process.env.ELECTRON_RENDERER_URL) {
    return process.env.ELECTRON_RENDERER_URL;
  }

  if (rendererUrlPromise) {
    return rendererUrlPromise;
  }

  rendererUrlPromise = (async () => {
    const standaloneServerPath = path.join(__dirname, "..", ".next", "standalone", "server.js");

    if (!fs.existsSync(standaloneServerPath)) {
      throw new Error(
        "Standalone renderer server is missing. Run the production build before launching Electron."
      );
    }

    const rendererPort = Number(process.env.ELECTRON_RENDERER_PORT || 3005);
    const rendererUrl = `http://127.0.0.1:${rendererPort}`;

    rendererServer = spawn(process.execPath, [standaloneServerPath], {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        HOSTNAME: "127.0.0.1",
        PORT: String(rendererPort),
      },
      stdio: "ignore",
      windowsHide: true,
    });

    const startedAt = Date.now();
    const timeoutMs = 60_000;

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const response = await fetch(rendererUrl, { method: "GET" });

        if (response.ok || response.status === 200) {
          return rendererUrl;
        }
      } catch {
        // Keep polling until the server becomes reachable.
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    try {
      rendererServer?.kill();
    } catch {
      // Ignore shutdown errors here; the caller will surface the startup failure.
    }
    rendererServer = null;
    throw new Error(`Timed out waiting for the renderer server at ${rendererUrl}.`);
  })();

  return rendererUrlPromise;
}

function registerEditorContextMenu(targetWindow) {
  targetWindow.webContents.on("context-menu", (_event, params) => {
    const template = [];

    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions.slice(0, 6)) {
        template.push({
          label: suggestion,
          click: () => {
            if (!targetWindow.isDestroyed()) {
              targetWindow.webContents.replaceMisspelling(suggestion);
            }
          },
        });
      }

      template.push({
        label: "Add to dictionary",
        click: () => {
          if (!targetWindow.isDestroyed()) {
            targetWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord);
          }
        },
      });
    }

    if (params.isEditable) {
      if (template.length > 0) {
        template.push({ type: "separator" });
      }

      template.push(
        { role: "undo", enabled: params.editFlags.canUndo },
        { role: "redo", enabled: params.editFlags.canRedo },
        { type: "separator" },
        { role: "cut", enabled: params.editFlags.canCut },
        { role: "copy", enabled: params.editFlags.canCopy },
        { role: "paste", enabled: params.editFlags.canPaste },
        { role: "selectAll" }
      );
    } else if (params.selectionText?.trim().length) {
      template.push({ role: "copy" });
    }

    if (template.length === 0) {
      return;
    }

    Menu.buildFromTemplate(template).popup({ window: targetWindow });
  });
}

function configureSpellChecker(targetWindow) {
  const spellSession = targetWindow.webContents.session;
  const availableLanguages = spellSession.availableSpellCheckerLanguages ?? [];
  const preferredLanguages = ["en-US", "en-GB", "en"].filter((language) =>
    availableLanguages.includes(language)
  );

  if (preferredLanguages.length > 0) {
    spellSession.setSpellCheckerLanguages(preferredLanguages);
    return;
  }

  if (availableLanguages.length > 0) {
    spellSession.setSpellCheckerLanguages([availableLanguages[0]]);
  }
}

async function createMainWindow() {
  const settings = readAppSettings();
  const windowBounds = settings.windowBounds ?? undefined;

  mainWindow = new BrowserWindow({
    width: windowBounds?.width ?? 1440,
    height: windowBounds?.height ?? 960,
    x: windowBounds?.x,
    y: windowBounds?.y,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: "#f8f8f6",
    title: "Book Bible Desktop",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      spellcheck: true,
    },
  });

  configureSpellChecker(mainWindow);
  registerEditorContextMenu(mainWindow);
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer console:${level}] ${sourceId}:${line} ${message}`);
  });
  mainWindow.webContents.on("page-error", (_event, errorMessage, sourceId, lineNumber) => {
    console.log(`[renderer page-error] ${sourceId}:${lineNumber} ${errorMessage}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.log(`[renderer gone] reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.on("close", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      updateAppSettings((currentSettings) => ({
        ...currentSettings,
        windowBounds: bounds,
      }));
    }
  });

  const rendererUrl = await ensureRendererUrl();
  await mainWindow.loadURL(rendererUrl);

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function migrateLegacyOpenAiKeyIfNeeded(settings = readAppSettings()) {
  const legacyEncryptedKey = settings.ai?.openai?.apiKeyEncrypted;

  if (hasOpenAiKeys() || typeof legacyEncryptedKey !== "string" || !legacyEncryptedKey.length) {
    return;
  }

  const apiKey = decryptApiKey(legacyEncryptedKey);
  const fingerprint = createKeyFingerprint(apiKey);
  const last4 = String(settings.ai?.openai?.apiKeyLast4 || apiKey.slice(-4)).slice(-4);
  const label = "Primary key";

  upsertOpenAiKey({
    encryptedKey: legacyEncryptedKey,
    fingerprint,
    label,
    last4,
    makeActive: true,
    createdAt: settings.ai?.openai?.updatedAt || new Date().toISOString(),
    updatedAt: settings.ai?.openai?.updatedAt || new Date().toISOString(),
  });

  updateAppSettings((currentSettings) => ({
    ...currentSettings,
    ai: {
      openai: {
        ...currentSettings.ai.openai,
        apiKeyEncrypted: null,
        apiKeyLast4: null,
        updatedAt: null,
      },
    },
  }));
}

function getOpenAiConfigMetadata(settings = readAppSettings()) {
  const environmentApiKey = getEnvironmentOpenAiApiKey();

  if (environmentApiKey) {
    return {
      configured: true,
      defaultModel: settings.ai?.openai?.defaultModel || DEFAULT_OPENAI_MODEL,
      last4: environmentApiKey.slice(-4),
      updatedAt: null,
      activeKeyId: createKeyFingerprint(environmentApiKey),
      keys: listOpenAiKeys(),
      source: "environment",
    };
  }

  migrateLegacyOpenAiKeyIfNeeded(settings);
  const activeKey = getActiveOpenAiKey();

  return {
    configured: Boolean(activeKey),
    defaultModel: settings.ai?.openai?.defaultModel || DEFAULT_OPENAI_MODEL,
    last4: activeKey?.last4 || null,
    updatedAt: activeKey?.updatedAt || null,
    activeKeyId: activeKey?.fingerprint || null,
    keys: listOpenAiKeys(),
    source: "store",
  };
}

function ensureApiKeyEncryptionAvailable() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      "Secure key storage is unavailable on this device right now. Restart the app and try again."
    );
  }
}

function encryptApiKey(apiKey) {
  ensureApiKeyEncryptionAvailable();
  return safeStorage.encryptString(apiKey).toString("base64");
}

function decryptApiKey(apiKeyEncrypted) {
  ensureApiKeyEncryptionAvailable();

  try {
    const decrypted = safeStorage.decryptString(Buffer.from(apiKeyEncrypted, "base64"));
    if (!decrypted.trim()) {
      throw new Error("Stored API key is empty.");
    }
    return decrypted;
  } catch {
    throw new Error(
      "Stored OpenAI API key could not be decrypted on this device. Re-enter your key in Profile."
    );
  }
}

async function callOpenAiResponsesApi({
  apiKey,
  input,
  instructions,
  maxOutputTokens = 180,
  model = DEFAULT_OPENAI_MODEL,
  requestType = "openai_responses",
  retries = OPENAI_DEFAULT_RETRY_COUNT,
  retryDelayMs = OPENAI_DEFAULT_RETRY_DELAY_MS,
  timeoutMs = OPENAI_DEFAULT_TIMEOUT_MS,
  signal,
}) {
  const sanitizedTimeoutMs = Math.max(1000, Math.min(timeoutMs, OPENAI_MAX_TIMEOUT_MS));
  const maxAttempts = Math.max(1, retries + 1);
  const startedAt = Date.now();
  const failureCategories = [];

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timeoutHandle = null;
    let abortListener = null;
    let didTimeout = false;
    let didCancel = false;

    try {
      timeoutHandle = setTimeout(() => {
        didTimeout = true;
        controller.abort(new Error("timeout"));
      }, sanitizedTimeoutMs);

      if (signal) {
        if (signal.aborted) {
          didCancel = true;
          controller.abort(new Error("canceled"));
        } else {
          abortListener = () => {
            didCancel = true;
            controller.abort(new Error("canceled"));
          };
          signal.addEventListener("abort", abortListener, { once: true });
        }
      }

      const response = await net.fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          instructions,
          max_output_tokens: maxOutputTokens,
          model,
        }),
        signal: controller.signal,
      });

      const rawBody = await response.text();
      let payload = {};

      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = {};
        }
      }

      if (!response.ok) {
        const failure = buildOpenAiFailure({
          status: response.status,
          payload,
        });
        failureCategories.push(failure.category || "unknown");

        if (attempt < maxAttempts && failure.retriable) {
          await waitWithJitter(retryDelayMs, attempt);
          continue;
        }

        throw createOpenAiError(failure, {
          attempts: attempt,
          durationMs: Date.now() - startedAt,
          failureCategories,
          retriesUsed: Math.max(0, attempt - 1),
        });
      }

      const usage = {
        cachedInputTokens: Number(
          payload?.usage?.input_tokens_details?.cached_tokens ??
            payload?.usage?.cached_input_tokens ??
            0
        ),
        outputTokens: Number(payload?.usage?.output_tokens ?? 0),
        promptTokens: Number(payload?.usage?.input_tokens ?? 0),
        totalTokens: Number(payload?.usage?.total_tokens ?? 0),
      };

      const usageRecord = recordOpenAiUsage({
        apiKey,
        model,
        requestType,
        usage,
      });
      sendRendererEvent("ai:usage:changed");

      return {
        payload,
        telemetry: {
          attempts: attempt,
          category:
            failureCategories.length > 0
              ? failureCategories[failureCategories.length - 1]
              : "none",
          durationMs: Date.now() - startedAt,
          failureCategories,
          outputTokens: usage.outputTokens,
          promptTokens: usage.promptTokens,
          retriesUsed: Math.max(0, attempt - 1),
          timeoutMs: sanitizedTimeoutMs,
          totalTokens: usage.totalTokens,
          cachedInputTokens: usage.cachedInputTokens,
          pricingKnown: usageRecord.pricingKnown,
          estimatedCostUsd: usageRecord.totalCostUsd,
        },
      };
    } catch (error) {
      const failure = buildOpenAiFailure({
        canceled: didCancel,
        error,
        timeout: didTimeout,
      });
      failureCategories.push(failure.category || "unknown");

      lastError = createOpenAiError(failure, {
        attempts: attempt,
        durationMs: Date.now() - startedAt,
        failureCategories,
        retriesUsed: Math.max(0, attempt - 1),
      });

      if (attempt < maxAttempts && failure.retriable) {
        await waitWithJitter(retryDelayMs, attempt);
        continue;
      }

      throw lastError;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (signal && abortListener) {
        signal.removeEventListener("abort", abortListener);
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("OpenAI request failed.");
}

async function verifyOpenAiApiKey(apiKey, model) {
  await callOpenAiResponsesApi({
    apiKey,
    input: "Reply with OK.",
    instructions: "Return the text OK only.",
    maxOutputTokens: 16,
    model,
    requestType: "api_key_verification",
  });
}

function buildOpenAiFailure({ status, payload, error, timeout = false, canceled = false }) {
  if (canceled) {
    return {
      category: "canceled",
      message: "OpenAI request was canceled.",
      retriable: false,
    };
  }

  if (timeout) {
    return {
      category: "timeout",
      message: "OpenAI request timed out.",
      retriable: true,
    };
  }

  if (typeof status === "number") {
    if (status === 401 || status === 403) {
      return {
        category: "auth",
        message: payload?.error?.message || "OpenAI authentication failed.",
        retriable: false,
      };
    }

    if (status === 429) {
      return {
        category: "rate_limited",
        message: payload?.error?.message || "OpenAI rate limit hit.",
        retriable: true,
      };
    }

    if (status >= 500) {
      return {
        category: "network",
        message: payload?.error?.message || `OpenAI server error (${status}).`,
        retriable: true,
      };
    }

    return {
      category: "invalid_response",
      message: payload?.error?.message || `OpenAI request failed (${status}).`,
      retriable: false,
    };
  }

  const errorMessage = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = errorMessage.toLowerCase();

  if (normalizedMessage.includes("timeout")) {
    return {
      category: "timeout",
      message: "OpenAI request timed out.",
      retriable: true,
    };
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("socket")
  ) {
    return {
      category: "network",
      message: errorMessage || "OpenAI network error.",
      retriable: true,
    };
  }

  return {
    category: "invalid_response",
    message: errorMessage || "OpenAI request failed.",
    retriable: false,
  };
}

function createOpenAiError(failure, telemetry = null) {
  const error = new Error(failure.message);
  error.category = failure.category;
  error.retriable = Boolean(failure.retriable);
  if (telemetry) {
    error.telemetry = telemetry;
  }
  return error;
}

async function waitWithJitter(baseDelayMs, attempt) {
  const exponent = Math.max(0, attempt - 1);
  const delay = baseDelayMs * 2 ** exponent;
  const jitter = Math.floor(Math.random() * 250);
  await new Promise((resolve) => setTimeout(resolve, delay + jitter));
}

function getStoredOpenAiApiKey(settings = readAppSettings()) {
  const environmentApiKey = getEnvironmentOpenAiApiKey();

  if (environmentApiKey) {
    return environmentApiKey;
  }

  migrateLegacyOpenAiKeyIfNeeded(settings);
  const activeKey = getActiveOpenAiKey();

  if (!activeKey) {
    throw new Error("No OpenAI API key is configured. Add one in Profile.");
  }

  const keyRecord = getOpenAiKeyRecordByFingerprint(activeKey.fingerprint);

  if (!keyRecord?.encrypted_key) {
    throw new Error("The active OpenAI API key is missing from storage. Re-add it in Profile.");
  }

  return decryptApiKey(keyRecord.encrypted_key);
}

const SUPPORTED_BRAIN_DUMP_TARGETS = new Set([
  "era",
  "book",
  "chapter",
  "scene",
  "character",
  "location",
  "faction",
  "culture",
  "religion",
  "technology",
  "plotThread",
  "theme",
]);

const TARGET_TABLE_CONFIG = {
  era: { tableName: "eras", labelField: "name" },
  book: { tableName: "books", labelField: "title" },
  chapter: { tableName: "chapters", labelField: "title" },
  scene: { tableName: "scenes", labelField: "title" },
  character: { tableName: "characters", labelField: "name", aliasField: "aliases" },
  location: { tableName: "locations", labelField: "name" },
  faction: { tableName: "factions", labelField: "name" },
  culture: { tableName: "cultures", labelField: "name" },
  religion: { tableName: "religions", labelField: "name" },
  technology: { tableName: "technologies", labelField: "name" },
  plotThread: { tableName: "plot_threads", labelField: "title" },
  theme: { tableName: "themes", labelField: "name" },
};

const TIMELINE_EVENT_TYPE_VALUES = new Set([
  "inciting_incident",
  "discovery",
  "revelation",
  "conflict",
  "turning_point",
  "aftermath",
  "travel",
  "political",
  "personal",
  "world_event",
  "other",
]);

function normalizeKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toKeyTokens(value) {
  const normalized = normalizeKey(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function computeTokenOverlapScore(leftTokens, rightTokens) {
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const rightSet = new Set(rightTokens);
  const sharedCount = leftTokens.filter((token) => rightSet.has(token)).length;
  return sharedCount / Math.max(leftTokens.length, rightTokens.length);
}

function extractQuestionLikeWarnings(rawText) {
  const text = String(rawText ?? "").trim();

  if (!text) {
    return [];
  }

  const lines = text
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);
  const questionLines = lines.filter((line) => {
    const normalized = line.toLowerCase();
    return (
      normalized.includes("?") ||
      normalized.includes("does this work") ||
      normalized.startsWith("question:") ||
      normalized.includes("open question")
    );
  });

  if (questionLines.length === 0) {
    return [];
  }

  return [
    `Captured ${questionLines.length} question-like note(s) from the brain dump. Review them before save.`,
  ];
}

function normalizeConfidence(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "confirmed") {
    return "confirmed";
  }

  if (normalized === "high") {
    return "high";
  }

  if (normalized === "medium") {
    return "medium";
  }

  return "low";
}

function normalizeEventType(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (TIMELINE_EVENT_TYPE_VALUES.has(normalized)) {
    return normalized;
  }

  return "other";
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    )
  );
}

function buildDefaultTimelineEventPrefill(projectContext) {
  return {
    title: "",
    summary: "",
    description: "",
    status: "active",
    eventType: "other",
    yearStart: asString(projectContext?.yearStart),
    monthStart: "",
    dayStart: "",
    yearEnd: asString(projectContext?.yearEnd),
    monthEnd: "",
    dayEnd: "",
    chronologyOrder: "",
    timeOfDayLabel: "",
    displayDateLabel: "",
    eraId: "",
    bookIds: [],
    chapterIds: [],
    sceneIds: [],
    characterIds: [],
    locationIds: [],
    factionIds: [],
    cultureIds: [],
    technologyIds: [],
    religionIds: [],
    plotThreadIds: [],
    themeIds: [],
    causes: "",
    consequences: "",
    predecessorEventIds: asStringArray(projectContext?.predecessorEventIds),
    successorEventIds: asStringArray(projectContext?.successorEventIds),
    publicWikiSummary: "",
  };
}

function normalizeTimelineBrainDumpOutput(parsed, projectContext) {
  const event = parsed && typeof parsed.event === "object" ? parsed.event : {};
  const causes = asStringArray(event?.causes).join(", ");
  const consequences = asStringArray(event?.consequences).join(", ");

  return {
    entities: Array.isArray(parsed?.entities) ? parsed.entities : [],
    prefill: {
      ...buildDefaultTimelineEventPrefill(projectContext),
      title: asString(event?.title),
      summary: asString(event?.summary),
      description: asString(event?.description),
      eventType: normalizeEventType(event?.eventType),
      yearStart: asString(event?.yearStart) || asString(projectContext?.yearStart),
      monthStart: asString(event?.monthStart),
      dayStart: asString(event?.dayStart),
      yearEnd: asString(event?.yearEnd) || asString(projectContext?.yearEnd),
      monthEnd: asString(event?.monthEnd),
      dayEnd: asString(event?.dayEnd),
      chronologyOrder: asString(event?.chronologyOrder),
      timeOfDayLabel: asString(event?.timeOfDayLabel),
      displayDateLabel: asString(event?.displayDateLabel),
      causes,
      consequences,
      publicWikiSummary: asString(event?.publicWikiSummary),
    },
  };
}

function getTargetRecordMatches(projectRuntime, target, mention) {
  const config = TARGET_TABLE_CONFIG[target];

  if (!config) {
    return [];
  }

  const mentionKey = normalizeKey(mention);

  if (!mentionKey) {
    return [];
  }

  const records = readAllDocuments(projectRuntime.db, config.tableName, projectRuntime.projectId);

  const exactMatches = records.filter((record) => {
    const labelKey = normalizeKey(record?.[config.labelField]);

    if (labelKey && labelKey === mentionKey) {
      return true;
    }

    if (!config.aliasField) {
      return false;
    }

    const aliases = Array.isArray(record?.[config.aliasField]) ? record[config.aliasField] : [];
    return aliases.some((alias) => normalizeKey(alias) === mentionKey);
  });

  const mentionTokens = toKeyTokens(mention);
  const fuzzyMatches = records.filter((record) => {
    if (exactMatches.some((exactRecord) => String(exactRecord.id) === String(record.id))) {
      return false;
    }

    const labelTokens = toKeyTokens(record?.[config.labelField]);
    const overlap = computeTokenOverlapScore(mentionTokens, labelTokens);

    if (overlap >= 0.67 && mentionTokens.length >= 2) {
      return true;
    }

    if (!config.aliasField) {
      return false;
    }

    const aliases = Array.isArray(record?.[config.aliasField]) ? record[config.aliasField] : [];
    return aliases.some((alias) => computeTokenOverlapScore(mentionTokens, toKeyTokens(alias)) >= 0.8);
  });

  return {
    exactMatches,
    fuzzyMatches,
  };
}

function buildEntitySuggestion(projectRuntime, entity, index, idPrefix = "") {
  const target = String(entity?.target ?? "").trim();
  const mention = asString(entity?.mention);
  const confidence = normalizeConfidence(entity?.confidence);
  const reason = asString(entity?.reason) || "Derived from the brain dump.";

  if (!SUPPORTED_BRAIN_DUMP_TARGETS.has(target)) {
    return null;
  }

  const { exactMatches, fuzzyMatches } = getTargetRecordMatches(projectRuntime, target, mention);
  const exactCandidates = exactMatches.map((record) => ({
    id: String(record?.id ?? ""),
    label: String(record?.[TARGET_TABLE_CONFIG[target].labelField] ?? record?.id ?? "").trim(),
    meta: asString(record?.summary),
  }));
  const fuzzyCandidates = fuzzyMatches.map((record) => ({
    id: String(record?.id ?? ""),
    label: String(record?.[TARGET_TABLE_CONFIG[target].labelField] ?? record?.id ?? "").trim(),
    meta: [asString(record?.summary), "fuzzy match"].filter(Boolean).join(" · "),
  }));
  const nonEmptyCandidates = [...exactCandidates, ...fuzzyCandidates].filter(
    (candidate) => candidate.id && candidate.label
  );
  let suggestedAction = "ignore";

  if (exactCandidates.length === 1) {
    suggestedAction = "link";
  } else if (exactCandidates.length > 1 || fuzzyCandidates.length > 0) {
    suggestedAction = "ambiguous";
  } else if (confidence === "medium" || confidence === "high" || confidence === "confirmed") {
    suggestedAction = "create";
  } else {
    suggestedAction = "unresolved";
  }

  return {
    id: `${idPrefix}${target}-${index + 1}`,
    target,
    mention,
    reason,
    confidence,
    suggestedAction,
    candidates: nonEmptyCandidates,
    suggestedCreateFields: {
      titleOrName: mention || `${target} ${index + 1}`,
      summary: asString(entity?.summary),
      description: asString(entity?.description),
      publicWikiSummary: asString(entity?.summary),
    },
  };
}

async function previewTimelineBrainDump(projectRuntime, input) {
  const brainDumpText = asString(input?.brainDumpText);

  if (!brainDumpText) {
    throw new Error("Brain dump text is required.");
  }

  const settings = readAppSettings();
  const apiKey = getStoredOpenAiApiKey(settings);
  const model = settings.ai.openai.defaultModel || DEFAULT_OPENAI_MODEL;
  const { payload, telemetry } = await callOpenAiResponsesApi({
    apiKey,
    input: buildTimelineBrainDumpUserPrompt({
      brainDumpText,
      projectContext: input?.projectContext ?? null,
    }),
    instructions: buildTimelineBrainDumpSystemPrompt(),
    maxOutputTokens: 1600,
    model,
    requestType: "timeline_brain_dump_preview",
  });
  const rawText = extractOpenAiResponseText(payload);
  const parsed = extractFirstJsonObject(rawText);
  const warnings = [...extractQuestionLikeWarnings(brainDumpText)];
  const telemetrySummary = telemetry
    ? {
        attempts: telemetry.attempts,
        category: telemetry.category,
        durationMs: telemetry.durationMs,
        outputTokens: telemetry.outputTokens,
        promptTokens: telemetry.promptTokens,
        retriesUsed: telemetry.retriesUsed,
        totalTokens: telemetry.totalTokens,
      }
    : null;

  if (!parsed) {
    warnings.push("AI response was not valid JSON. Using an empty draft.");
  }

  const normalized = normalizeTimelineBrainDumpOutput(parsed ?? {}, input?.projectContext ?? null);
  const entitySuggestions = normalized.entities
    .map((entity, index) => buildEntitySuggestion(projectRuntime, entity, index))
    .filter(Boolean);

  return {
    entitySuggestions,
    prefill: normalized.prefill,
    telemetry: telemetrySummary,
    warnings,
  };
}

function getAiJobsRoot(projectRuntime) {
  return path.join(projectRuntime.projectPath, ".ai-jobs");
}

function getAiJobPath(projectRuntime, jobId) {
  return path.join(getAiJobsRoot(projectRuntime), `${jobId}.json`);
}

function notifyAiJobsChanged() {
  sendRendererEvent("ai:jobs:changed");
}

function writeAiJobRecord(projectRuntime, jobRecord) {
  ensureDirectory(getAiJobsRoot(projectRuntime));
  fs.writeFileSync(getAiJobPath(projectRuntime, jobRecord.id), JSON.stringify(jobRecord, null, 2) + "\n", "utf8");
}

function readAiJobRecord(projectRuntime, jobId) {
  const jobPath = getAiJobPath(projectRuntime, jobId);

  if (!fs.existsSync(jobPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(jobPath, "utf8"));
  } catch {
    return null;
  }
}

function listAiJobRecords(projectRuntime) {
  const jobsRoot = getAiJobsRoot(projectRuntime);

  if (!fs.existsSync(jobsRoot)) {
    return [];
  }

  return fs
    .readdirSync(jobsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => readAiJobRecord(projectRuntime, entry.name.replace(/\.json$/i, "")))
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.updatedAt || right.createdAt) - Date.parse(left.updatedAt || left.createdAt));
}

function buildAiJobSummary(jobRecord) {
  return {
    createdAt: jobRecord.createdAt,
    finishedAt: jobRecord.finishedAt ?? null,
    id: jobRecord.id,
    status: jobRecord.status,
    title: jobRecord.title,
    updatedAt: jobRecord.updatedAt,
  };
}

function updateAiJobRecord(projectRuntime, jobId, updater) {
  const current = readAiJobRecord(projectRuntime, jobId);

  if (!current) {
    return null;
  }

  const next = updater(current);
  const updated = {
    ...next,
    updatedAt: new Date().toISOString(),
  };
  writeAiJobRecord(projectRuntime, updated);
  notifyAiJobsChanged();
  return updated;
}

function markStaleJobs(projectRuntime) {
  const jobs = listAiJobRecords(projectRuntime);

  jobs.forEach((job) => {
    if (job.status === "queued" || job.status === "running") {
      updateAiJobRecord(projectRuntime, job.id, (current) => ({
        ...current,
        finishedAt: new Date().toISOString(),
        status: "failed-needs-rerun",
        errorMessage: "Job was interrupted before completion. Re-run to continue.",
      }));
    }
  });
}

function createAiJobRecord({ brainDumpText, projectContext }) {
  const now = new Date().toISOString();
  const id = `ai-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    title: "Multi-event timeline brain dump",
    status: "queued",
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    input: {
      brainDumpText,
      projectContext: projectContext ?? null,
    },
    progress: {
      totalChunks: 0,
      completedChunks: 0,
      currentStep: "queued",
      totalAttempts: 0,
      totalRetries: 0,
    },
    chunkMetrics: [],
    failureCategory: null,
    result: null,
    warnings: [],
    errorMessage: null,
  };
}

async function startMultiEventTimelineBrainDumpJob(projectRuntime, input) {
  const brainDumpText = asString(input?.brainDumpText);

  if (!brainDumpText) {
    throw new Error("Brain dump text is required.");
  }

  const projectContext = input?.projectContext ?? null;
  const jobRecord = createAiJobRecord({ brainDumpText, projectContext });
  writeAiJobRecord(projectRuntime, jobRecord);
  notifyAiJobsChanged();
  queueRunAiJob(projectRuntime, jobRecord.id, projectContext);

  return {
    jobId: jobRecord.id,
    status: jobRecord.status,
  };
}

function queueRunAiJob(projectRuntime, jobId, projectContext) {
  setTimeout(() => {
    const runtime = aiJobRuntimeById.get(jobId);

    if (runtime?.running) {
      return;
    }

    const controller = new AbortController();
    aiJobRuntimeById.set(jobId, {
      controller,
      running: true,
    });

    runMultiEventTimelineBrainDumpJob(projectRuntime, jobId, projectContext, controller.signal)
      .catch(() => {})
      .finally(() => {
        aiJobRuntimeById.delete(jobId);
      });
  }, 10);
}

function cancelAiJob(projectRuntime, jobId) {
  const existing = readAiJobRecord(projectRuntime, jobId);

  if (!existing) {
    return null;
  }

  if (
    existing.status === "completed" ||
    existing.status === "failed" ||
    existing.status === "failed-needs-rerun" ||
    existing.status === "canceled"
  ) {
    return existing;
  }

  const runtime = aiJobRuntimeById.get(jobId);

  if (runtime?.controller) {
    runtime.controller.abort();
  }

  const updated = updateAiJobRecord(projectRuntime, jobId, (current) => ({
    ...current,
    finishedAt: new Date().toISOString(),
    status: "canceled",
    progress: {
      ...current.progress,
      currentStep: "canceled",
    },
  }));

  return updated;
}

function listAiJobs(projectRuntime) {
  return listAiJobRecords(projectRuntime).map((jobRecord) => buildAiJobSummary(jobRecord));
}

function getAiJobStatus(projectRuntime, jobId) {
  return readAiJobRecord(projectRuntime, jobId);
}

function normalizeMultiChunkOutput(parsed) {
  if (Array.isArray(parsed)) {
    return {
      events: parsed,
      links: [],
      warnings: [],
    };
  }

  const events = Array.isArray(parsed?.events) ? parsed.events : [];
  const links = Array.isArray(parsed?.crossEventLinks) ? parsed.crossEventLinks : [];
  const warnings = asStringArray(parsed?.warnings);

  return {
    events,
    links,
    warnings,
  };
}

function buildDraftId(index) {
  return `draft-event-${index + 1}`;
}

function normalizeMultiEventDrafts(projectRuntime, extractedEvents, projectContext) {
  const drafts = extractedEvents.map((entry, index) => {
    const normalized = normalizeTimelineBrainDumpOutput(entry ?? {}, projectContext ?? null);
    const draftId = buildDraftId(index);
    const entitySuggestions = normalized.entities
      .map((entity, entityIndex) => buildEntitySuggestion(projectRuntime, entity, entityIndex, `${draftId}-`))
      .filter(Boolean);

    return {
      draftId,
      prefill: normalized.prefill,
      entitySuggestions,
      suggestedPredecessorDraftIds: [],
      suggestedSuccessorDraftIds: [],
      warnings: [],
    };
  });

  return drafts;
}

function applySuggestedLinksByTitle(drafts, links) {
  const byTitle = new Map();

  drafts.forEach((draft) => {
    const key = normalizeKey(draft.prefill.title);

    if (key) {
      byTitle.set(key, draft.draftId);
    }
  });

  links.forEach((link) => {
    const fromId = byTitle.get(normalizeKey(link?.fromTitle));
    const toId = byTitle.get(normalizeKey(link?.toTitle));

    if (!fromId || !toId || fromId === toId) {
      return;
    }

    const fromDraft = drafts.find((draft) => draft.draftId === fromId);
    const toDraft = drafts.find((draft) => draft.draftId === toId);

    if (!fromDraft || !toDraft) {
      return;
    }

    if (!fromDraft.suggestedSuccessorDraftIds.includes(toId)) {
      fromDraft.suggestedSuccessorDraftIds.push(toId);
    }

    if (!toDraft.suggestedPredecessorDraftIds.includes(fromId)) {
      toDraft.suggestedPredecessorDraftIds.push(fromId);
    }
  });
}

function dedupeDraftsByIdentity(drafts) {
  const seen = new Set();
  const deduped = [];

  for (const draft of drafts) {
    const key = [
      normalizeKey(draft.prefill.title),
      normalizeKey(draft.prefill.summary),
      draft.prefill.yearStart,
      draft.prefill.yearEnd,
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(draft);
  }

  return deduped.map((draft, index) => ({
    ...draft,
    draftId: buildDraftId(index),
    entitySuggestions: draft.entitySuggestions.map((suggestion, suggestionIndex) => ({
      ...suggestion,
      id: `${buildDraftId(index)}-${suggestion.target}-${suggestionIndex + 1}`,
    })),
  }));
}

async function runMultiEventTimelineBrainDumpJob(projectRuntime, jobId, projectContext, signal) {
  try {
    const job = readAiJobRecord(projectRuntime, jobId);

    if (!job || job.status === "canceled") {
      return;
    }

    const chunks = splitTextIntoChunks(job.input?.brainDumpText ?? "", MULTI_BRAIN_DUMP_MAX_CHARS);

    updateAiJobRecord(projectRuntime, jobId, (current) => ({
      ...current,
      status: "running",
    progress: {
      completedChunks: 0,
      currentStep: "extracting",
      totalAttempts: 0,
      totalChunks: chunks.length,
      totalRetries: 0,
    },
  }));

    const settings = readAppSettings();
    const apiKey = getStoredOpenAiApiKey(settings);
    const model = settings.ai.openai.defaultModel || DEFAULT_OPENAI_MODEL;
    const extractedEvents = [];
    const extractedLinks = [];
    const warnings = extractQuestionLikeWarnings(job.input?.brainDumpText ?? "");

    for (let index = 0; index < chunks.length; index += 1) {
      if (signal?.aborted) {
        updateAiJobRecord(projectRuntime, jobId, (current) => ({
          ...current,
          finishedAt: new Date().toISOString(),
          status: "canceled",
        }));
        return;
      }

      const chunkText = chunks[index];
      const { payload, telemetry } = await callOpenAiResponsesApi({
        apiKey,
        input: buildMultiTimelineBrainDumpUserPrompt({
          chunkIndex: index + 1,
          chunkText,
          chunkTotal: chunks.length,
          projectContext: projectContext ?? null,
        }),
        instructions: buildMultiTimelineBrainDumpSystemPrompt(),
        maxOutputTokens: 2200,
        model,
        requestType: "timeline_brain_dump_chunk",
        retries: 4,
        timeoutMs: 140000,
        signal,
      });
      const rawText = extractOpenAiResponseText(payload);
      const parsed = extractFirstJsonObject(rawText);

      if (!parsed) {
        warnings.push(`Chunk ${index + 1} returned invalid JSON and was skipped.`);
      } else {
        const normalized = normalizeMultiChunkOutput(parsed);
        extractedEvents.push(...normalized.events);
        extractedLinks.push(...normalized.links);
        warnings.push(...normalized.warnings);
      }

      updateAiJobRecord(projectRuntime, jobId, (current) => ({
        ...current,
        chunkMetrics: [
          ...(Array.isArray(current.chunkMetrics) ? current.chunkMetrics : []),
          {
            attempts: telemetry?.attempts ?? 1,
            category: telemetry?.category ?? "unknown",
            chunkIndex: index + 1,
            durationMs: telemetry?.durationMs ?? 0,
            outputTokens: telemetry?.outputTokens ?? 0,
            promptTokens: telemetry?.promptTokens ?? 0,
            retriesUsed: telemetry?.retriesUsed ?? 0,
            totalTokens: telemetry?.totalTokens ?? 0,
          },
        ],
        progress: {
          completedChunks: index + 1,
          currentStep: index + 1 === chunks.length ? "finalizing" : "extracting",
          totalAttempts:
            (current.progress?.totalAttempts ?? 0) + (telemetry?.attempts ?? 1),
          totalChunks: chunks.length,
          totalRetries:
            (current.progress?.totalRetries ?? 0) + (telemetry?.retriesUsed ?? 0),
        },
        warnings,
      }));
    }

    const drafts = normalizeMultiEventDrafts(projectRuntime, extractedEvents, projectContext);
    applySuggestedLinksByTitle(drafts, extractedLinks);
    const dedupedDrafts = dedupeDraftsByIdentity(drafts);

    updateAiJobRecord(projectRuntime, jobId, (current) => ({
      ...current,
      finishedAt: new Date().toISOString(),
      status: "completed",
      progress: {
        completedChunks: chunks.length,
        currentStep: "completed",
        totalChunks: chunks.length,
      },
      result: {
        events: dedupedDrafts,
        warnings,
      },
      warnings,
    }));
  } catch (error) {
    if (signal?.aborted) {
      updateAiJobRecord(projectRuntime, jobId, (current) => ({
        ...current,
        finishedAt: new Date().toISOString(),
        status: "canceled",
      }));
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unknown error occurred during AI extraction.";
    const category =
      error && typeof error === "object" && typeof error.category === "string"
        ? error.category
        : "unknown";
    updateAiJobRecord(projectRuntime, jobId, (current) => ({
      ...current,
      failureCategory: category,
      finishedAt: new Date().toISOString(),
      status: "failed",
      errorMessage: message,
      progress: {
        ...current.progress,
        currentStep: "failed",
      },
    }));
  }
}

const VALIDATION_ESTIMATED_PROMPT_TOKEN_USD = 0.0000004;
const VALIDATION_ESTIMATED_OUTPUT_TOKEN_USD = 0.0000016;

function getValidationReportsRoot(projectRuntime) {
  return path.join(projectRuntime.projectPath, ".ai-validation-reports");
}

function getValidationReportPath(projectRuntime, reportId) {
  return path.join(getValidationReportsRoot(projectRuntime), `${reportId}.json`);
}

function writeValidationReport(projectRuntime, report) {
  ensureDirectory(getValidationReportsRoot(projectRuntime));
  fs.writeFileSync(
    getValidationReportPath(projectRuntime, report.id),
    JSON.stringify(report, null, 2) + "\n",
    "utf8"
  );
}

function readValidationReport(projectRuntime, reportId) {
  const reportPath = getValidationReportPath(projectRuntime, reportId);

  if (!fs.existsSync(reportPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch {
    return null;
  }
}

function listValidationReports(projectRuntime) {
  const reportsRoot = getValidationReportsRoot(projectRuntime);

  if (!fs.existsSync(reportsRoot)) {
    return [];
  }

  return fs
    .readdirSync(reportsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const reportId = entry.name.replace(/\.json$/i, "");
      const report = readValidationReport(projectRuntime, reportId);

      if (!report) {
        return null;
      }

      return {
        createdAt: report.createdAt,
        id: report.id,
        path: getValidationReportPath(projectRuntime, report.id),
        projectId: report.projectId,
      };
    })
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function buildSeedRecord(id, fields) {
  const now = new Date().toISOString();
  return {
    created_at: now,
    id,
    updated_at: now,
    ...fields,
  };
}

function seedValidationReferenceData(projectRuntime) {
  const insertBatch = (tableName, rows) => {
    rows.forEach((row) => {
      const existing = getSingleDocument(projectRuntime.db, tableName, projectRuntime.projectId, [
        { field: "id", operator: "eq", value: row.id },
      ]);

      if (!existing) {
        insertDocuments(projectRuntime.db, tableName, projectRuntime.projectId, row);
      }
    });
  };

  insertBatch("books", [
    buildSeedRecord("book_fallow_house", { title: "Fallow House", summary: "Book 1." }),
    buildSeedRecord("book_well_under_salt", { title: "The Well Under Salt", summary: "Book 2." }),
    buildSeedRecord("book_lungglass_winter", { title: "Lungglass Winter", summary: "Book 3." }),
  ]);
  insertBatch("eras", [
    buildSeedRecord("era_before_ashfall", { name: "Before the Ashfall" }),
    buildSeedRecord("era_lantern_years", { name: "Lantern Years" }),
    buildSeedRecord("era_after_red_snow", { name: "After Red Snow" }),
  ]);
  insertBatch("characters", [
    buildSeedRecord("character_mara_prentice", { aliases: ["Mara"], name: "Mara Prentice" }),
    buildSeedRecord("character_rowan_grey", { aliases: ["Rowan"], name: "Rowan Grey" }),
    buildSeedRecord("character_nora_prentice", { aliases: ["Nora"], name: "Nora Prentice" }),
    buildSeedRecord("character_brother_cal", { aliases: ["Cal"], name: "Brother Cal" }),
  ]);
  insertBatch("locations", [
    buildSeedRecord("location_gutterbank_parish", { name: "Gutterbank Parish" }),
    buildSeedRecord("location_saint_veya_catacombs", { name: "Saint Veya Catacombs" }),
    buildSeedRecord("location_hushwater_marsh", { name: "Hushwater Marsh" }),
    buildSeedRecord("location_black_choir_mill", { name: "Black Choir Mill" }),
  ]);
  insertBatch("factions", [
    buildSeedRecord("faction_lantern_wardens", { name: "Lantern Wardens" }),
    buildSeedRecord("faction_bone_choir", { name: "Bone Choir" }),
    buildSeedRecord("faction_pilgrim_syndicate", { name: "Pilgrim Syndicate" }),
  ]);
  insertBatch("cultures", [
    buildSeedRecord("culture_salt_kept", { name: "Salt-Kept Culture" }),
  ]);
  insertBatch("religions", [
    buildSeedRecord("religion_third_breath", { name: "Rite of Third Breath" }),
  ]);
  insertBatch("technologies", [
    buildSeedRecord("technology_lungglass_masks", { name: "Lungglass Mask Filtration" }),
  ]);
  insertBatch("themes", [
    buildSeedRecord("theme_inherited_guilt", { name: "Inherited Guilt" }),
    buildSeedRecord("theme_memory_rot", { name: "Memory Rot" }),
  ]);
  insertBatch("plot_threads", [
    buildSeedRecord("plot_memory_tax", { title: "Memory Tax" }),
    buildSeedRecord("plot_ledger_harvest", { title: "Ledger Harvest" }),
  ]);
}

function normalizeValidationTimelineEventStatus(value) {
  const normalized = asString(value).toLowerCase();

  if (normalized === "draft" || normalized === "active" || normalized === "archived") {
    return normalized;
  }

  return "active";
}

function parseValidationInteger(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const normalized = asString(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeValidationIdList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => asString(entry))
        .filter(Boolean)
    )
  );
}

function parseValidationCommaSeparatedList(value) {
  return Array.from(
    new Set(
      asString(value)
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

function buildValidationTimelineEventDocument(prefill, fallbackTitle) {
  const title = asString(prefill?.title) || asString(fallbackTitle) || "Validation Event";
  const status = normalizeValidationTimelineEventStatus(prefill?.status);

  return {
    title,
    summary: asString(prefill?.summary),
    description: asString(prefill?.description),
    status,
    tags: [],
    is_archived: status === "archived",
    canon_level: "working",
    confidence: "medium",
    event_type: normalizeEventType(prefill?.eventType),
    year_start: parseValidationInteger(prefill?.yearStart),
    month_start: parseValidationInteger(prefill?.monthStart),
    day_start: parseValidationInteger(prefill?.dayStart),
    year_end: parseValidationInteger(prefill?.yearEnd),
    month_end: parseValidationInteger(prefill?.monthEnd),
    day_end: parseValidationInteger(prefill?.dayEnd),
    chronology_order: parseValidationInteger(prefill?.chronologyOrder),
    time_of_day_label: asString(prefill?.timeOfDayLabel),
    display_date_label: asString(prefill?.displayDateLabel),
    era_id: asString(prefill?.eraId) || null,
    book_ids: normalizeValidationIdList(prefill?.bookIds),
    chapter_ids: normalizeValidationIdList(prefill?.chapterIds),
    scene_ids: normalizeValidationIdList(prefill?.sceneIds),
    character_ids: normalizeValidationIdList(prefill?.characterIds),
    location_ids: normalizeValidationIdList(prefill?.locationIds),
    faction_ids: normalizeValidationIdList(prefill?.factionIds),
    culture_ids: normalizeValidationIdList(prefill?.cultureIds),
    technology_ids: normalizeValidationIdList(prefill?.technologyIds),
    religion_ids: normalizeValidationIdList(prefill?.religionIds),
    plot_thread_ids: normalizeValidationIdList(prefill?.plotThreadIds),
    theme_ids: normalizeValidationIdList(prefill?.themeIds),
    causes: parseValidationCommaSeparatedList(prefill?.causes),
    consequences: parseValidationCommaSeparatedList(prefill?.consequences),
    predecessor_event_ids: normalizeValidationIdList(prefill?.predecessorEventIds),
    successor_event_ids: normalizeValidationIdList(prefill?.successorEventIds),
    public_wiki_summary: asString(prefill?.publicWikiSummary),
  };
}

function getAvailableValidationRecordId(projectRuntime, tableName, baseId) {
  let candidateId = baseId;
  let suffix = 2;

  while (
    getSingleDocument(projectRuntime.db, tableName, projectRuntime.projectId, [
      { field: "id", operator: "eq", value: candidateId },
    ])
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildValidationEntityRecordId(target, mention) {
  const normalizedTarget = String(target ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
  const normalizedMention = slugify(asString(mention)) || "record";

  return `${normalizedTarget}_${normalizedMention.replace(/-/g, "_")}`;
}

function buildValidationEntityRecord(target, suggestion, fallbackId) {
  const titleOrName = asString(suggestion?.suggestedCreateFields?.titleOrName) || asString(suggestion?.mention);
  const summary = asString(suggestion?.suggestedCreateFields?.summary);
  const description = asString(suggestion?.suggestedCreateFields?.description);
  const publicWikiSummary =
    asString(suggestion?.suggestedCreateFields?.publicWikiSummary) || summary;
  const labelValue = titleOrName || asString(fallbackId) || "Validation Record";
  const now = new Date().toISOString();
  const record = {
    id: fallbackId,
    created_at: now,
    updated_at: now,
    summary,
    description,
    public_wiki_summary: publicWikiSummary,
  };

  if (target === "book" || target === "chapter" || target === "scene" || target === "plotThread") {
    record.title = labelValue;
  } else {
    record.name = labelValue;
  }

  if (target === "character") {
    record.aliases = asString(suggestion?.mention) ? [asString(suggestion?.mention)] : [];
  }

  return record;
}

function resolveValidationEntitySuggestion(projectRuntime, suggestion) {
  const target = String(suggestion?.target ?? "").trim();
  const config = TARGET_TABLE_CONFIG[target];

  if (!config) {
    return null;
  }

  const { exactMatches, fuzzyMatches } = getTargetRecordMatches(
    projectRuntime,
    target,
    suggestion?.mention
  );
  const match = exactMatches[0] ?? fuzzyMatches[0] ?? null;

  if (match?.id) {
    return String(match.id);
  }

  const fallbackId = getAvailableValidationRecordId(
    projectRuntime,
    config.tableName,
    buildValidationEntityRecordId(target, suggestion?.mention)
  );
  const record = buildValidationEntityRecord(target, suggestion, fallbackId);
  insertDocuments(projectRuntime.db, config.tableName, projectRuntime.projectId, record);
  return fallbackId;
}

function applyValidationLinkedId(values, target, linkedId) {
  if (!linkedId) {
    return;
  }

  if (target === "era") {
    if (!values.era_id) {
      values.era_id = linkedId;
    }

    return;
  }

  if (target === "book") {
    values.book_ids.push(linkedId);
    return;
  }

  if (target === "chapter") {
    values.chapter_ids.push(linkedId);
    return;
  }

  if (target === "scene") {
    values.scene_ids.push(linkedId);
    return;
  }

  if (target === "character") {
    values.character_ids.push(linkedId);
    return;
  }

  if (target === "location") {
    values.location_ids.push(linkedId);
    return;
  }

  if (target === "faction") {
    values.faction_ids.push(linkedId);
    return;
  }

  if (target === "culture") {
    values.culture_ids.push(linkedId);
    return;
  }

  if (target === "religion") {
    values.religion_ids.push(linkedId);
    return;
  }

  if (target === "technology") {
    values.technology_ids.push(linkedId);
    return;
  }

  if (target === "plotThread") {
    values.plot_thread_ids.push(linkedId);
    return;
  }

  if (target === "theme") {
    values.theme_ids.push(linkedId);
  }
}

async function materializeValidationEntitySuggestions(projectRuntime, values, entitySuggestions) {
  for (const suggestion of Array.isArray(entitySuggestions) ? entitySuggestions : []) {
    const linkedId = resolveValidationEntitySuggestion(projectRuntime, suggestion);
    applyValidationLinkedId(values, suggestion?.target, linkedId);
  }

  values.book_ids = Array.from(new Set(values.book_ids));
  values.chapter_ids = Array.from(new Set(values.chapter_ids));
  values.scene_ids = Array.from(new Set(values.scene_ids));
  values.character_ids = Array.from(new Set(values.character_ids));
  values.location_ids = Array.from(new Set(values.location_ids));
  values.faction_ids = Array.from(new Set(values.faction_ids));
  values.culture_ids = Array.from(new Set(values.culture_ids));
  values.technology_ids = Array.from(new Set(values.technology_ids));
  values.religion_ids = Array.from(new Set(values.religion_ids));
  values.plot_thread_ids = Array.from(new Set(values.plot_thread_ids));
  values.theme_ids = Array.from(new Set(values.theme_ids));
}

function createValidationTimelineEvent(projectRuntime, values) {
  const now = new Date().toISOString();
  const title = asString(values?.title) || "Validation Event";
  const baseId = slugify(title).replace(/-/g, "_") || "validation_event";
  const id = getAvailableValidationRecordId(projectRuntime, "timeline_events", `event_${baseId}`);
  const document = {
    id,
    created_at: now,
    updated_at: now,
    ...values,
  };

  insertDocuments(projectRuntime.db, "timeline_events", projectRuntime.projectId, document);
  return id;
}

function updateValidationTimelineEvent(projectRuntime, eventId, patch) {
  updateDocuments(
    projectRuntime.db,
    "timeline_events",
    projectRuntime.projectId,
    {
      ...patch,
      updated_at: new Date().toISOString(),
    },
    [{ field: "id", operator: "eq", value: eventId }]
  );
}

function normalizeValidationEventDraft(prefill, fallbackTitle) {
  const document = buildValidationTimelineEventDocument(prefill, fallbackTitle);

  return {
    ...document,
    book_ids: [...document.book_ids],
    chapter_ids: [...document.chapter_ids],
    scene_ids: [...document.scene_ids],
    character_ids: [...document.character_ids],
    location_ids: [...document.location_ids],
    faction_ids: [...document.faction_ids],
    culture_ids: [...document.culture_ids],
    technology_ids: [...document.technology_ids],
    religion_ids: [...document.religion_ids],
    plot_thread_ids: [...document.plot_thread_ids],
    theme_ids: [...document.theme_ids],
    causes: [...document.causes],
    consequences: [...document.consequences],
    predecessor_event_ids: [...document.predecessor_event_ids],
    successor_event_ids: [...document.successor_event_ids],
  };
}

async function materializeSingleValidationScenario(projectRuntime, scenario, preview) {
  const values = normalizeValidationEventDraft(preview?.prefill ?? {}, scenario.id);
  await materializeValidationEntitySuggestions(
    projectRuntime,
    values,
    preview?.entitySuggestions ?? []
  );

  return createValidationTimelineEvent(projectRuntime, values);
}

async function materializeMultiValidationScenario(projectRuntime, job) {
  const drafts = Array.isArray(job?.result?.events) ? job.result.events : [];
  const createdByDraftId = new Map();
  const valuesByDraftId = new Map();

  for (const draft of drafts) {
    const values = normalizeValidationEventDraft(draft?.prefill ?? {}, draft?.draftId ?? "draft-event");
    await materializeValidationEntitySuggestions(
      projectRuntime,
      values,
      draft?.entitySuggestions ?? []
    );

    const mappedPredecessors = normalizeValidationIdList(draft?.suggestedPredecessorDraftIds)
      .map((draftId) => createdByDraftId.get(draftId) ?? "")
      .filter(Boolean);
    values.predecessor_event_ids = Array.from(
      new Set([...values.predecessor_event_ids, ...mappedPredecessors])
    );
    values.successor_event_ids = [];

    const eventId = createValidationTimelineEvent(projectRuntime, values);
    createdByDraftId.set(draft.draftId, eventId);
    valuesByDraftId.set(draft.draftId, values);
  }

  for (const draft of drafts) {
    const eventId = createdByDraftId.get(draft.draftId);
    const values = valuesByDraftId.get(draft.draftId);

    if (!eventId || !values) {
      continue;
    }

    const predecessorEventIds = Array.from(
      new Set(
        normalizeValidationIdList(draft?.suggestedPredecessorDraftIds)
          .map((draftId) => createdByDraftId.get(draftId) ?? "")
          .filter(Boolean)
      )
    );
    const successorEventIds = Array.from(
      new Set(
        normalizeValidationIdList(draft?.suggestedSuccessorDraftIds)
          .map((draftId) => createdByDraftId.get(draftId) ?? "")
          .filter(Boolean)
      )
    );

    updateValidationTimelineEvent(projectRuntime, eventId, {
      ...values,
      predecessor_event_ids: Array.from(
        new Set([...values.predecessor_event_ids, ...predecessorEventIds])
      ),
      successor_event_ids: successorEventIds,
    });
  }
}

function computeEstimatedCostUsd(promptTokens, completionTokens) {
  return (
    promptTokens * VALIDATION_ESTIMATED_PROMPT_TOKEN_USD +
    completionTokens * VALIDATION_ESTIMATED_OUTPUT_TOKEN_USD
  );
}

function waitForJobTerminalState(projectRuntime, jobId, timeoutMs = 10 * 60 * 1000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const job = readAiJobRecord(projectRuntime, jobId);

      if (!job) {
        clearInterval(interval);
        reject(new Error(`Validation job ${jobId} not found.`));
        return;
      }

      if (
        job.status === "completed" ||
        job.status === "failed" ||
        job.status === "failed-needs-rerun" ||
        job.status === "canceled"
      ) {
        clearInterval(interval);
        resolve(job);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timed out waiting for validation job ${jobId}.`));
      }
    }, 400);
  });
}

function evaluateRequiredFields(prefill, requiredFields) {
  return requiredFields.map((fieldName) => ({
    pass: String(prefill?.[fieldName] ?? "").trim().length > 0,
    text: `Field ${fieldName} populated`,
  }));
}

function evaluateExpectedTargets(entitySuggestions, expectedTargets) {
  return expectedTargets.map((target) => ({
    pass: entitySuggestions.some((entry) => entry.target === target),
    text: `Entity suggestions include target ${target}`,
  }));
}

async function runSingleValidationScenario(projectRuntime, scenario) {
  const startedAt = Date.now();
  const notes = [];
  let promptTokens = 0;
  let completionTokens = 0;
  let passedChecks = 0;
  let totalChecks = 0;

  try {
    const preview = await previewTimelineBrainDump(projectRuntime, {
      brainDumpText: scenario.text,
      projectContext: {
        insertionContext: scenario.insertionContext ?? null,
      },
    });

    promptTokens += Number(preview?.telemetry?.promptTokens ?? 0);
    completionTokens += Number(preview?.telemetry?.outputTokens ?? 0);
    const checks = [
      ...evaluateRequiredFields(preview.prefill, scenario.requiredFields),
      ...evaluateExpectedTargets(preview.entitySuggestions, scenario.expectedTargets),
      {
        pass: preview.entitySuggestions.every(
          (suggestion) =>
            suggestion.suggestedAction !== "link" || suggestion.candidates.length === 1
        ),
        text: "No non-conservative auto-link decisions",
      },
      {
        pass: preview.warnings.length > 0,
        text: "Question-like notes surfaced as warnings",
      },
    ];

    checks.forEach((check) => {
      totalChecks += 1;
      if (check.pass) {
        passedChecks += 1;
      } else {
        notes.push(check.text);
      }
    });

    try {
      const createdEventId = await materializeSingleValidationScenario(
        projectRuntime,
        scenario,
        preview
      );
      notes.push(`Materialized timeline event ${createdEventId}.`);
    } catch (error) {
      notes.push(
        error instanceof Error
          ? `Failed to materialize timeline event: ${error.message}`
          : "Failed to materialize timeline event."
      );
    }
  } catch (error) {
    notes.push(error instanceof Error ? error.message : "Single scenario failed.");
    totalChecks += 1;
  }

  return {
    assertionPassCount: passedChecks,
    assertionTotalCount: Math.max(totalChecks, 1),
    completionTokens,
    durationMs: Date.now() - startedAt,
    id: scenario.id,
    mode: "single",
    notes,
    pass: passedChecks >= Math.max(1, Math.floor(totalChecks * 0.9)),
    promptTokens,
  };
}

async function runMultiValidationScenario(projectRuntime, scenario, mode = "multi") {
  const startedAt = Date.now();
  const notes = [];
  let promptTokens = 0;
  let completionTokens = 0;
  let passedChecks = 0;
  let totalChecks = 0;

  try {
    const started = await startMultiEventTimelineBrainDumpJob(projectRuntime, {
      brainDumpText: scenario.text,
      projectContext: {
        insertionContext: scenario.insertionContext ?? null,
      },
    });
    const job = await waitForJobTerminalState(projectRuntime, started.jobId);
    const chunkMetrics = Array.isArray(job.chunkMetrics) ? job.chunkMetrics : [];

    promptTokens += chunkMetrics.reduce(
      (total, metric) => total + Number(metric.promptTokens ?? 0),
      0
    );
    completionTokens += chunkMetrics.reduce(
      (total, metric) => total + Number(metric.outputTokens ?? 0),
      0
    );
    totalChecks += 1;
    if (job.status === "completed") {
      passedChecks += 1;
    } else {
      notes.push(`Job not completed: ${job.status}`);
    }

    const draftEvents = Array.isArray(job?.result?.events) ? job.result.events : [];
    totalChecks += 1;
    if (draftEvents.length >= Number(scenario.minEvents ?? 1)) {
      passedChecks += 1;
    } else {
      notes.push(`Expected >=${scenario.minEvents} events, got ${draftEvents.length}.`);
    }

    const withTitleCount = draftEvents.filter(
      (event) =>
        String(event?.prefill?.title ?? "").trim() &&
        String(event?.prefill?.summary ?? "").trim()
    ).length;
    totalChecks += 1;
    if (draftEvents.length > 0 && withTitleCount / draftEvents.length >= 0.8) {
      passedChecks += 1;
    } else {
      notes.push("Less than 80% of extracted events contain both title and summary.");
    }

    totalChecks += 1;
    if (
      draftEvents.every((event) =>
        (event.entitySuggestions ?? []).every(
          (suggestion) =>
            suggestion.suggestedAction !== "link" || suggestion.candidates.length === 1
        )
      )
    ) {
      passedChecks += 1;
    } else {
      notes.push("Found non-conservative auto-link decision(s) in multi-event output.");
    }

    try {
      await materializeMultiValidationScenario(projectRuntime, job);
      notes.push(`Materialized ${draftEvents.length} timeline draft(s).`);
    } catch (error) {
      notes.push(
        error instanceof Error
          ? `Failed to materialize multi-event drafts: ${error.message}`
          : "Failed to materialize multi-event drafts."
      );
    }
  } catch (error) {
    notes.push(error instanceof Error ? error.message : "Multi scenario failed.");
    totalChecks += 1;
  }

  return {
    assertionPassCount: passedChecks,
    assertionTotalCount: Math.max(totalChecks, 1),
    completionTokens,
    durationMs: Date.now() - startedAt,
    id: scenario.id,
    mode,
    notes,
    pass: passedChecks >= Math.max(1, Math.floor(totalChecks * 0.9)),
    promptTokens,
  };
}

async function runBrainDumpValidationSuite(input = {}) {
  const budgetUsd = Math.max(1, Number(input?.budgetUsd ?? 10));
  const previousProjectPath = currentProjectRuntime?.projectPath ?? null;
  const sandboxTitle =
    String(input?.sandboxProjectTitle ?? "").trim() ||
    `BrainDump Sandbox Horror Trilogy ${new Date().toISOString().slice(0, 10)}`;
  const reportId = `validation-${Date.now()}`;
  const fixtures = buildValidationFixtures();
  const scenarioResults = [];
  let promptTokens = 0;
  let completionTokens = 0;

  createProject({
    title: sandboxTitle,
  });

  const sandboxRuntime = ensureCurrentProjectRuntime();
  seedValidationReferenceData(sandboxRuntime);

  const scenarios = [
    ...fixtures.single.map((scenario) => ({ ...scenario, mode: "single" })),
    ...fixtures.multi.map((scenario) => ({ ...scenario, mode: "multi" })),
    ...fixtures.stress.map((scenario) => ({ ...scenario, mode: "stress" })),
  ];

  for (const scenario of scenarios) {
    const currentEstimatedCost = computeEstimatedCostUsd(promptTokens, completionTokens);

    if (currentEstimatedCost >= budgetUsd) {
      scenarioResults.push({
        assertionPassCount: 0,
        assertionTotalCount: 1,
        brainDumpText: scenario.text,
        durationMs: 0,
        id: scenario.id,
        mode: scenario.mode,
        notes: [`Skipped due to budget guardrail at $${budgetUsd}.`],
        pass: false,
      });
      continue;
    }

    if (scenario.mode === "single") {
      const result = await runSingleValidationScenario(sandboxRuntime, scenario);
      promptTokens += result.promptTokens;
      completionTokens += result.completionTokens;
      scenarioResults.push({
        assertionPassCount: result.assertionPassCount,
        assertionTotalCount: result.assertionTotalCount,
        brainDumpText: scenario.text,
        durationMs: result.durationMs,
        id: result.id,
        mode: result.mode,
        notes: result.notes,
        pass: result.pass,
      });
      continue;
    }

    const result = await runMultiValidationScenario(
      sandboxRuntime,
      scenario,
      scenario.mode === "stress" ? "stress" : "multi"
    );
    promptTokens += result.promptTokens;
    completionTokens += result.completionTokens;
    scenarioResults.push({
      assertionPassCount: result.assertionPassCount,
      assertionTotalCount: result.assertionTotalCount,
      brainDumpText: scenario.text,
      durationMs: result.durationMs,
      id: result.id,
      mode: result.mode,
      notes: result.notes,
      pass: result.pass,
    });
  }

  generateExports(sandboxRuntime);

  const passedCount = scenarioResults.filter((entry) => entry.pass).length;
  const totalAssertions = scenarioResults.reduce(
    (total, entry) => total + entry.assertionTotalCount,
    0
  );
  const passedAssertions = scenarioResults.reduce(
    (total, entry) => total + entry.assertionPassCount,
    0
  );
  const report = {
    costGuardrail: {
      budgetUsd,
      estimatedCostUsd: Number(
        computeEstimatedCostUsd(promptTokens, completionTokens).toFixed(6)
      ),
    },
    createdAt: new Date().toISOString(),
    estimatedTokenUsage: {
      completionTokens,
      promptTokens,
      totalTokens: promptTokens + completionTokens,
    },
    id: reportId,
    metrics: {
      mappingCorrectnessPct:
        totalAssertions === 0 ? 0 : Number(((passedAssertions / totalAssertions) * 100).toFixed(2)),
      scenarioPassPct:
        scenarioResults.length === 0
          ? 0
          : Number(((passedCount / scenarioResults.length) * 100).toFixed(2)),
    },
    path: getValidationReportPath(sandboxRuntime, reportId),
    projectId: sandboxRuntime.projectId,
    scenarioResults,
    totals: {
      passed: passedCount,
      scenarios: scenarioResults.length,
    },
  };

  writeValidationReport(sandboxRuntime, report);

  if (previousProjectPath && fs.existsSync(previousProjectPath)) {
    openProjectAtPath(previousProjectPath);
  }

  return report;
}

function sortBrainDumpTimelineEvents(timelineEvents) {
  return [...(Array.isArray(timelineEvents) ? timelineEvents : [])].sort((left, right) => {
    const leftYear = left.year_start ?? left.year_end ?? Number.MAX_SAFE_INTEGER;
    const rightYear = right.year_start ?? right.year_end ?? Number.MAX_SAFE_INTEGER;

    if (leftYear !== rightYear) {
      return leftYear - rightYear;
    }

    const leftOrder = left.chronology_order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.chronology_order ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.title ?? left.id ?? "").localeCompare(String(right.title ?? right.id ?? ""));
  });
}

function formatBrainDumpTimelineLabel(timelineEvent) {
  const year = timelineEvent.year_start ?? timelineEvent.year_end ?? "";
  const month = timelineEvent.month_start ?? timelineEvent.month_end ?? "";
  const day = timelineEvent.day_start ?? timelineEvent.day_end ?? "";
  const parts = [year, month, day].filter((part) => part !== "");
  return parts.length > 0 ? parts.join("-") : String(timelineEvent.display_date_label ?? year ?? "");
}

function buildBrainDumpTimelineInsertionContext(timelineEvents, insertionIndex, label) {
  const windowSize = 5;
  const beforeStart = Math.max(0, insertionIndex - windowSize);
  const beforeEvents = timelineEvents.slice(beforeStart, insertionIndex);
  const afterEvents = timelineEvents.slice(insertionIndex, insertionIndex + windowSize);

  const surroundingEvents = [
    ...beforeEvents.map((timelineEvent, index) => ({
      chronologyLabel: formatBrainDumpTimelineLabel(timelineEvent),
      id: timelineEvent.id,
      position: beforeStart + index + 1,
      relation: "before",
      title: timelineEvent.title,
    })),
    ...afterEvents.map((timelineEvent, index) => ({
      chronologyLabel: formatBrainDumpTimelineLabel(timelineEvent),
      id: timelineEvent.id,
      position: insertionIndex + index + 1,
      relation: "after",
      title: timelineEvent.title,
    })),
  ];

  const previousEvent = timelineEvents[insertionIndex - 1] ?? null;
  const nextEvent = timelineEvents[insertionIndex] ?? null;

  return {
    insertionContext: {
      helperText:
        previousEvent && nextEvent
          ? `Between ${previousEvent.title} and ${nextEvent.title}.`
          : label,
      label,
      surroundingEvents,
    },
    predecessorEventIds: previousEvent ? [previousEvent.id] : [],
    successorEventIds: nextEvent ? [nextEvent.id] : [],
    yearStart: String(previousEvent?.year_start ?? previousEvent?.year_end ?? ""),
    yearEnd: String(nextEvent?.year_start ?? nextEvent?.year_end ?? ""),
  };
}

async function runDigitalPrisonBrainDumpChecks(projectRuntime) {
  const projectPath = projectRuntime.projectPath;
  const timelineEvents = sortBrainDumpTimelineEvents(
    readAllDocuments(projectRuntime.db, "timeline_events", projectRuntime.projectId)
  );
  const noteRoot = path.join(projectPath, "inbox", "brain-dumps");
  const cases = [
    {
      file: path.join(noteRoot, "single-2415-to-2416.md"),
      insertionIndex: 6,
      mode: "single",
    },
    {
      file: path.join(noteRoot, "single-2420-to-2435.md"),
      insertionIndex: 8,
      mode: "single",
    },
    {
      file: path.join(noteRoot, "multi-2415-to-2416.md"),
      insertionIndex: 6,
      mode: "multi",
    },
    {
      file: path.join(noteRoot, "multi-2420-to-2435.md"),
      insertionIndex: 8,
      mode: "multi",
    },
  ];

  const results = [];

  for (const testCase of cases) {
    if (!fs.existsSync(testCase.file)) {
      throw new Error(`Brain dump file not found: ${testCase.file}`);
    }

    const brainDumpText = fs.readFileSync(testCase.file, "utf8");
    const context = buildBrainDumpTimelineInsertionContext(
      timelineEvents,
      testCase.insertionIndex,
      "Digital Prison brain dump test gap"
    );

    if (testCase.mode === "single") {
      const preview = await previewTimelineBrainDump(projectRuntime, {
        brainDumpText,
        projectContext: context,
      });

      results.push({
        file: path.basename(testCase.file),
        mode: "single",
        eventType: preview.prefill.eventType,
        title: preview.prefill.title,
        warnings: preview.warnings,
        entitySuggestionCount: preview.entitySuggestions.length,
        entitySuggestions: preview.entitySuggestions.map((suggestion) => ({
          target: suggestion.target,
          mention: suggestion.mention,
          action: suggestion.suggestedAction,
          candidates: suggestion.candidates.map((candidate) => candidate.label),
        })),
      });
      continue;
    }

    const started = await startMultiEventTimelineBrainDumpJob(projectRuntime, {
      brainDumpText,
      projectContext: context,
    });
    const job = await waitForJobTerminalState(projectRuntime, started.jobId);
    const drafts = Array.isArray(job?.result?.events) ? job.result.events : [];

    results.push({
      file: path.basename(testCase.file),
      mode: "multi",
      jobId: started.jobId,
      status: job.status,
      warningCount: Array.isArray(job?.warnings) ? job.warnings.length : 0,
      draftCount: drafts.length,
      draftTitles: drafts.map((draft) => draft?.prefill?.title ?? draft?.event?.title ?? ""),
      draftWarnings: drafts.map((draft) => draft?.warnings ?? []),
    });
  }

  return results;
}

function buildDigitalPrisonUiGapTarget(timelineEvents, insertionIndex, fallbackLabel) {
  const previousEvent = timelineEvents[insertionIndex - 1] ?? null;
  const nextEvent = timelineEvents[insertionIndex] ?? null;

  return {
    helperText:
      previousEvent && nextEvent
        ? `Between ${previousEvent.title} and ${nextEvent.title}.`
        : fallbackLabel,
    nextTitle: nextEvent?.title ?? null,
    previousTitle: previousEvent?.title ?? null,
  };
}

async function executeRendererScript(script) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error("Main window is unavailable.");
  }

  return mainWindow.webContents.executeJavaScript(script, true);
}

async function waitForRendererCondition(conditionSource, timeoutMs = 60000) {
  return executeRendererScript(`(async () => {
    const startedAt = Date.now();
    const timeoutMs = ${Number(timeoutMs)};

    while (Date.now() - startedAt < timeoutMs) {
      if (${conditionSource}) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error("Timed out waiting for the requested renderer state.");
  })()`);
}

async function waitForRendererButtonText(buttonText, timeoutMs = 60000) {
  const textLiteral = JSON.stringify(String(buttonText));
  return executeRendererScript(`(async () => {
    const targetText = ${textLiteral};
    const startedAt = Date.now();
    const timeoutMs = ${Number(timeoutMs)};

    while (Date.now() - startedAt < timeoutMs) {
      const button = Array.from(document.querySelectorAll("button")).find(
        (element) => element.textContent?.trim() === targetText
      );

      if (button) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(\`Timed out waiting for button text: ${textLiteral}\`);
  })()`);
}

async function clickRendererButtonByText(buttonText, timeoutMs = 60000) {
  const textLiteral = JSON.stringify(String(buttonText));
  return executeRendererScript(`(async () => {
    const targetText = ${textLiteral};
    const startedAt = Date.now();
    const timeoutMs = ${Number(timeoutMs)};

    while (Date.now() - startedAt < timeoutMs) {
      const buttons = Array.from(document.querySelectorAll("button")).filter(
        (element) => element.textContent?.trim() === targetText
      );
      const button = buttons.at(-1) ?? null;

      if (button) {
        button.click();
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(\`Timed out waiting to click button text: ${textLiteral}\`);
  })()`);
}

async function clickRendererLinkByText(linkText, timeoutMs = 60000) {
  const textLiteral = JSON.stringify(String(linkText));
  return executeRendererScript(`(async () => {
    const targetText = ${textLiteral};
    const startedAt = Date.now();
    const timeoutMs = ${Number(timeoutMs)};

    while (Date.now() - startedAt < timeoutMs) {
      const links = Array.from(document.querySelectorAll("a")).filter(
        (element) => element.textContent?.trim() === targetText
      );
      const link = links.at(-1) ?? null;

      if (link) {
        link.click();
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(\`Timed out waiting to click link text: ${textLiteral}\`);
  })()`);
}

async function clickRendererTimelineInsertionByHelperText(helperText, timeoutMs = 60000) {
  const helperTextLiteral = JSON.stringify(String(helperText));
  return executeRendererScript(`(async () => {
    const targetText = ${helperTextLiteral};
    const startedAt = Date.now();
    const timeoutMs = ${Number(timeoutMs)};

    while (Date.now() - startedAt < timeoutMs) {
      const helperNode = Array.from(document.querySelectorAll("p")).find(
        (element) => element.textContent?.trim() === targetText
      );

      if (helperNode) {
        const row = helperNode.closest("div.relative.grid");
        const button = row ? Array.from(row.querySelectorAll("button")).find(
          (element) => element.textContent?.trim() === "+"
        ) : null;

        if (button) {
          button.click();
          return true;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(\`Timed out waiting for insertion row: ${helperTextLiteral}\`);
  })()`);
}

async function setRendererTextareaValue(text, timeoutMs = 60000) {
  const textLiteral = JSON.stringify(String(text));
  return executeRendererScript(`(async () => {
    const targetText = ${textLiteral};
    const startedAt = Date.now();
    const timeoutMs = ${Number(timeoutMs)};

    while (Date.now() - startedAt < timeoutMs) {
      const textarea = document.querySelector("textarea");

      if (textarea) {
        textarea.value = targetText;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error("Timed out waiting for a textarea.");
  })()`);
}

async function getRendererLocationPathname() {
  return executeRendererScript(`window.location.pathname`);
}

async function runDigitalPrisonUiChecks(projectRuntime) {
  const projectPath = projectRuntime.projectPath;
  const noteRoot = path.join(projectPath, "inbox", "brain-dumps");
  const rendererUrl = new URL("/timeline", await ensureRendererUrl()).toString();
  const cases = [
    {
      file: path.join(noteRoot, "single-2415-to-2416.md"),
      insertionIndex: 6,
      mode: "single",
    },
    {
      file: path.join(noteRoot, "multi-2420-to-2435.md"),
      insertionIndex: 8,
      mode: "multi",
    },
  ];

  const results = [];
  let timelineEvents = sortBrainDumpTimelineEvents(
    readAllDocuments(projectRuntime.db, "timeline_events", projectRuntime.projectId)
  );

  await mainWindow.loadURL(rendererUrl);
  await executeRendererScript(`(() => {
    window.addEventListener("error", (event) => {
      console.log("[renderer window error] " + (event.message || "unknown error"));
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      console.log("[renderer unhandledrejection] " + reason);
    });
    return true;
  })()`);
  const startupProbe = await executeRendererScript(`(async () => {
    const withTimeout = (label, promise, timeoutMs = 5000) =>
      Promise.race([
        promise.then((value) => ({ label, status: "ok", value })),
        new Promise((resolve) =>
          setTimeout(() => resolve({ label, status: "timeout" }), timeoutMs)
        ),
      ]);

    const currentProjectPromise = window.bookBible?.project?.getCurrent
      ? withTimeout("project.getCurrent", window.bookBible.project.getCurrent())
      : Promise.resolve({ label: "project.getCurrent", status: "missing" });
    const recentProjectsPromise = window.bookBible?.launcher?.listRecentProjects
      ? withTimeout("launcher.listRecentProjects", window.bookBible.launcher.listRecentProjects())
      : Promise.resolve({ label: "launcher.listRecentProjects", status: "missing" });

    return {
      bodyText: document.body ? document.body.innerText.slice(0, 2000) : "",
      currentProject: await currentProjectPromise,
      bookBibleDebug:
        typeof window.__bookBibleDebug === "object" && window.__bookBibleDebug
          ? window.__bookBibleDebug
          : null,
      nextDataKeys:
        typeof window.__NEXT_DATA__ === "object" && window.__NEXT_DATA__
          ? Object.keys(window.__NEXT_DATA__)
          : null,
      resourceScripts: performance
        .getEntriesByType("resource")
        .filter((entry) => entry.initiatorType === "script")
        .slice(0, 20)
        .map((entry) => ({
          name: entry.name,
          duration: entry.duration,
          transferSize: entry.transferSize,
        })),
      scriptSrcs: Array.from(document.querySelectorAll("script"))
        .map((script) => script.src || script.getAttribute("src"))
        .filter(Boolean)
        .slice(0, 20),
      recentProjects: await recentProjectsPromise,
      pathname: window.location.pathname,
      readyState: document.readyState,
      title: document.title,
      hasBookBible: Boolean(window.bookBible),
      hasProjectApi: Boolean(window.bookBible?.project),
      hasLauncherApi: Boolean(window.bookBible?.launcher),
    };
  })()`);
  console.log(`[book-bible] digital-prison-ui startup probe: ${JSON.stringify(startupProbe)}`);
  await waitForRendererCondition(`document.body.innerText.includes("Create timeline event")`, 120000);

  for (const testCase of cases) {
    if (!fs.existsSync(testCase.file)) {
      throw new Error(`Brain dump file not found: ${testCase.file}`);
    }

    const beforeEvents = [...timelineEvents];
    const beforeIds = new Set(beforeEvents.map((event) => event.id));
    const helperTarget = buildDigitalPrisonUiGapTarget(
      beforeEvents,
      testCase.insertionIndex,
      "Digital Prison brain dump test gap"
    );
    const brainDumpText = fs.readFileSync(testCase.file, "utf8");

    await clickRendererTimelineInsertionByHelperText(helperTarget.helperText);

    if (testCase.mode === "single") {
      await clickRendererLinkByText("Create timeline event");
      await waitForRendererCondition(`document.body.innerText.includes("AI Single-Event")`, 120000);
      await clickRendererButtonByText("AI Single-Event");
      await setRendererTextareaValue(brainDumpText);
      await clickRendererButtonByText("Generate AI Draft", 120000);
      await waitForRendererButtonText("Approve & Continue", 120000);
      await clickRendererButtonByText("Approve & Continue");
      await waitForRendererButtonText("Create timeline event", 120000);
      await clickRendererButtonByText("Create timeline event");
      await waitForRendererCondition(
        `document.body.innerText.includes("Create timeline event") && !document.body.innerText.includes("Timeline composer")`,
        120000
      );
    } else {
      await clickRendererLinkByText("Create timeline event");
      await waitForRendererCondition(`document.body.innerText.includes("AI Multi-Event")`, 120000);
      await clickRendererButtonByText("AI Multi-Event");
      await setRendererTextareaValue(brainDumpText);
      await clickRendererButtonByText("Start Background Job", 120000);
      await waitForRendererCondition(`window.location.pathname.startsWith("/ai-jobs/")`, 120000);
      const jobPathname = await getRendererLocationPathname();
      const jobId = String(jobPathname.split("/").filter(Boolean).pop() ?? "");
      const jobRecord = readAiJobRecord(projectRuntime, jobId);
      await waitForRendererButtonText("Apply reviewed events", 120000);
      await clickRendererButtonByText("Apply reviewed events");
      await waitForRendererButtonText("Open timeline", 120000);
      await clickRendererButtonByText("Open timeline");
      await waitForRendererCondition(
        `document.body.innerText.includes("Create timeline event") && !document.body.innerText.includes("Apply reviewed events")`,
        120000
      );

      const afterEvents = sortBrainDumpTimelineEvents(
        readAllDocuments(projectRuntime.db, "timeline_events", projectRuntime.projectId)
      );
      const addedEvents = afterEvents.filter((event) => !beforeIds.has(event.id));
      const expectedDraftCount = Array.isArray(jobRecord?.result?.events)
        ? jobRecord.result.events.length
        : 0;
      timelineEvents = afterEvents;

      if (addedEvents.length !== expectedDraftCount) {
        throw new Error(
          `Expected ${expectedDraftCount} applied events, found ${addedEvents.length}.`
        );
      }

      results.push({
        file: path.basename(testCase.file),
        helperText: helperTarget.helperText,
        mode: "multi",
        jobId,
        draftCount: expectedDraftCount,
        addedCount: addedEvents.length,
        addedTitles: addedEvents.map((event) => event.title),
        beforeWindow: beforeEvents.slice(
          Math.max(0, testCase.insertionIndex - 5),
          testCase.insertionIndex
        ).map((event) => event.title),
        afterWindow: beforeEvents.slice(
          testCase.insertionIndex,
          testCase.insertionIndex + 5
        ).map((event) => event.title),
      });
      continue;
    }

    const afterEvents = sortBrainDumpTimelineEvents(
      readAllDocuments(projectRuntime.db, "timeline_events", projectRuntime.projectId)
    );
    const addedEvents = afterEvents.filter((event) => !beforeIds.has(event.id));
    timelineEvents = afterEvents;

    if (addedEvents.length !== 1) {
      throw new Error(`Expected 1 applied event, found ${addedEvents.length}.`);
    }

    results.push({
      file: path.basename(testCase.file),
      helperText: helperTarget.helperText,
      mode: "single",
      addedCount: addedEvents.length,
      addedTitles: addedEvents.map((event) => event.title),
      beforeWindow: beforeEvents.slice(
        Math.max(0, testCase.insertionIndex - 5),
        testCase.insertionIndex
      ).map((event) => event.title),
      afterWindow: beforeEvents.slice(
        testCase.insertionIndex,
        testCase.insertionIndex + 5
      ).map((event) => event.title),
    });
  }

  return results;
}

function registerProtocol() {
  protocol.handle(APP_PROTOCOL, async (request) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    const requestUrl = new URL(request.url);
    const [, bucketIdEncoded, storagePathEncoded] = requestUrl.pathname.split("/");
    const bucketId = decodeURIComponent(bucketIdEncoded || "");
    const storagePath = decodeURIComponent(storagePathEncoded || "");
    const absolutePath = resolveStorageAbsolutePath(projectRuntime, bucketId, storagePath);

    if (!fs.existsSync(absolutePath)) {
      return new Response("Missing file.", { status: 404 });
    }

    return net.fetch(pathToFileURL(absolutePath).toString());
  });
}

function registerIpcHandlers() {
  ipcMain.handle("launcher:list-recent-projects", async () => {
    console.log("[book-bible] ipc launcher:list-recent-projects");
    return listRecentProjects();
  });

  ipcMain.on("launcher:list-recent-projects-sync", (event) => {
    console.log("[book-bible] ipc launcher:list-recent-projects-sync");
    event.returnValue = listRecentProjects();
  });

  ipcMain.handle("launcher:create-project", async (_event, input) => createProject(input));

  ipcMain.handle("launcher:open-existing-project", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: getDefaultProjectsRoot(),
      properties: ["openDirectory"],
      title: "Open Book Bible Project",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return openProjectAtPath(result.filePaths[0]);
  });

  ipcMain.handle("launcher:open-project-at-path", async (_event, projectPath) =>
    openProjectAtPath(projectPath)
  );

  ipcMain.handle("launcher:remove-recent-project", async (_event, projectPath) => {
    updateAppSettings((settings) => ({
      ...settings,
      recentProjects: (settings.recentProjects ?? []).filter(
        (recentProject) => recentProject.path !== projectPath
      ),
    }));

    sendRendererEvent("project:changed");
  });

  ipcMain.handle("launcher:reveal-project", async (_event, projectPath) => {
    const resolvedProjectPath =
      projectPath || currentProjectRuntime?.projectPath || readAppSettings().currentProjectPath;

    if (!resolvedProjectPath) {
      throw new Error("No project folder is available to reveal.");
    }

    await shell.openPath(resolvedProjectPath);
  });

  ipcMain.handle("project:get-current", async () => {
    console.log("[book-bible] ipc project:get-current");
    return serializeCurrentProject(currentProjectRuntime);
  });

  ipcMain.on("project:get-current-sync", (event) => {
    console.log("[book-bible] ipc project:get-current-sync");
    event.returnValue = serializeCurrentProject(currentProjectRuntime);
  });

  ipcMain.handle("project:close", async () => {
    closeCurrentProject();
  });

  ipcMain.handle("project:rename", async (_event, title) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    const normalizedTitle = String(title ?? "").trim();

    if (!normalizedTitle) {
      throw new Error("Project title cannot be empty.");
    }

    projectRuntime.manifest = {
      ...projectRuntime.manifest,
      title: normalizedTitle,
    };
    writeProjectManifest(projectRuntime.projectPath, projectRuntime.manifest);
    updateDocuments(
      projectRuntime.db,
      "projects",
      projectRuntime.projectId,
      {
        title: normalizedTitle,
        updated_at: new Date().toISOString(),
      },
      [{ field: "id", operator: "eq", value: projectRuntime.projectId }]
    );
    rememberRecentProject(projectRuntime);
    generateExports(projectRuntime);
    sendRendererEvent("project:changed");
    return serializeCurrentProject(projectRuntime);
  });

  ipcMain.handle("records:query", async (_event, input) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    return queryDocuments(projectRuntime.db, input.tableName, projectRuntime.projectId, input);
  });

  ipcMain.handle("records:insert", async (_event, input) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    const result = insertDocuments(
      projectRuntime.db,
      input.tableName,
      projectRuntime.projectId,
      input.values
    );
    generateExports(projectRuntime);
    return result;
  });

  ipcMain.handle("records:update", async (_event, input) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    const result = updateDocuments(
      projectRuntime.db,
      input.tableName,
      projectRuntime.projectId,
      input.values,
      input.filters ?? []
    );
    generateExports(projectRuntime);
    return result;
  });

  ipcMain.handle("records:delete", async (_event, input) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    const result = deleteDocuments(
      projectRuntime.db,
      input.tableName,
      projectRuntime.projectId,
      input.filters ?? []
    );
    generateExports(projectRuntime);
    return result;
  });

  ipcMain.handle("records:upsert", async (_event, input) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    const result = insertDocuments(
      projectRuntime.db,
      input.tableName,
      projectRuntime.projectId,
      input.values
    );
    generateExports(projectRuntime);
    return result;
  });

  ipcMain.handle("attachments:upload", async (_event, input) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    const absolutePath = resolveStorageAbsolutePath(
      projectRuntime,
      input.bucketId,
      input.storagePath
    );

    ensureDirectory(path.dirname(absolutePath));
    fs.writeFileSync(absolutePath, Buffer.from(input.data));
  });

  ipcMain.handle("attachments:remove", async (_event, input) => {
    const projectRuntime = ensureCurrentProjectRuntime();

    input.storagePaths.forEach((storagePath) => {
      const absolutePath = resolveStorageAbsolutePath(
        projectRuntime,
        input.bucketId,
        storagePath
      );

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    });
  });

  ipcMain.handle("attachments:create-preview-url", async (_event, input) =>
    createAttachmentPreviewUrl(input.bucketId, input.storagePath)
  );

  ipcMain.handle("drafts:list", async () => listDrafts(ensureCurrentProjectRuntime()));

  ipcMain.handle("drafts:get", async (_event, draftId) =>
    getDraftById(ensureCurrentProjectRuntime(), draftId)
  );

  ipcMain.handle("drafts:save", async (_event, input) => {
    const detail = writeDraftText(ensureCurrentProjectRuntime(), input.draftId, input.rawText);
    sendRendererEvent("drafts:changed");
    return detail;
  });

  ipcMain.handle("drafts:approve", async (_event, draftId) => {
    const detail = moveDraftToStatus(ensureCurrentProjectRuntime(), draftId, "approved");
    sendRendererEvent("drafts:changed");
    return detail;
  });

  ipcMain.handle("drafts:reject", async (_event, draftId) => {
    const detail = moveDraftToStatus(ensureCurrentProjectRuntime(), draftId, "rejected");
    sendRendererEvent("drafts:changed");
    return detail;
  });

  ipcMain.handle("drafts:apply", async (_event, draftId) => {
    const detail = applyDraft(ensureCurrentProjectRuntime(), draftId);
    sendRendererEvent("drafts:changed");
    return detail;
  });

  ipcMain.handle("exports:get-status", async () => {
    const projectRuntime = ensureCurrentProjectRuntime();
    return {
      lastExportAt: getMeta(projectRuntime.db, "last_export_at"),
    };
  });

  ipcMain.handle("exports:regenerate", async () => {
    const projectRuntime = ensureCurrentProjectRuntime();
    generateExports(projectRuntime);
    return {
      lastExportAt: getMeta(projectRuntime.db, "last_export_at"),
    };
  });

  ipcMain.handle("ai:get-config", async () => ({
    openai: getOpenAiConfigMetadata(),
  }));

  ipcMain.handle("ai:get-dashboard", async (_event, input) => {
    const scope = typeof input?.scope === "string" ? input.scope.trim() : "all";
    const activeKey = getActiveOpenAiKey();
    const apiKeyFingerprint =
      scope === "all" ? null : scope === "active" ? activeKey?.fingerprint ?? null : scope;

    return {
      openai: getOpenAiConfigMetadata(),
      usage: getOpenAiUsageDashboard({
        apiKeyFingerprint,
        rangePreset: typeof input?.rangePreset === "string" ? input.rangePreset : "30d",
      }),
    };
  });

  ipcMain.handle("ai:list-openai-keys", async () => listOpenAiKeys());

  ipcMain.handle("ai:set-openai-key", async (_event, apiKeyInput, labelInput) => {
    const apiKey = String(apiKeyInput ?? "").trim();
    const label = String(labelInput ?? "").trim();

    if (!apiKey) {
      throw new Error("OpenAI API key cannot be empty.");
    }

    if (!apiKey.startsWith("sk-")) {
      throw new Error("That does not look like a valid OpenAI API key.");
    }

    const settings = readAppSettings();
    const model = settings.ai.openai.defaultModel || DEFAULT_OPENAI_MODEL;
    await verifyOpenAiApiKey(apiKey, model);

    const encryptedKey = encryptApiKey(apiKey);
    const last4 = apiKey.slice(-4);
    const fingerprint = createKeyFingerprint(apiKey);
    const updatedAt = new Date().toISOString();

    upsertOpenAiKey({
      encryptedKey,
      fingerprint,
      label: label || "Primary key",
      last4,
      makeActive: true,
      updatedAt,
    });

    sendRendererEvent("ai:config:changed");

    return { fingerprint, last4, updatedAt };
  });

  ipcMain.handle("ai:add-openai-key", async (_event, apiKeyInput, labelInput) => {
    const apiKey = String(apiKeyInput ?? "").trim();
    const label = String(labelInput ?? "").trim();

    if (!apiKey) {
      throw new Error("OpenAI API key cannot be empty.");
    }

    if (!apiKey.startsWith("sk-")) {
      throw new Error("That does not look like a valid OpenAI API key.");
    }

    const settings = readAppSettings();
    const model = settings.ai.openai.defaultModel || DEFAULT_OPENAI_MODEL;
    await verifyOpenAiApiKey(apiKey, model);

    const encryptedKey = encryptApiKey(apiKey);
    const last4 = apiKey.slice(-4);
    const fingerprint = createKeyFingerprint(apiKey);
    const updatedAt = new Date().toISOString();

    upsertOpenAiKey({
      encryptedKey,
      fingerprint,
      label: label || `Key ****${last4}`,
      last4,
      makeActive: true,
      updatedAt,
    });

    sendRendererEvent("ai:config:changed");

    return { fingerprint, last4, updatedAt };
  });

  ipcMain.handle("ai:set-active-openai-key", async (_event, keyIdInput) => {
    const keyId = String(keyIdInput ?? "").trim();

    if (!keyId) {
      throw new Error("Select a key to make active.");
    }

    setStoredActiveOpenAiKey(keyId);
    sendRendererEvent("ai:config:changed");
  });

  ipcMain.handle("ai:remove-openai-key", async (_event, keyIdInput) => {
    const activeKey = getActiveOpenAiKey();
    const keyId = String(keyIdInput ?? activeKey?.fingerprint ?? "").trim();

    if (!keyId) {
      return;
    }

    removeStoredOpenAiKey(keyId);
    sendRendererEvent("ai:config:changed");
  });

  ipcMain.handle("ai:generate-summary", async (_event, input) => {
    const description = String(input?.description ?? "").trim();

    if (!description) {
      throw new Error("Description is required before generating a summary.");
    }

    const settings = readAppSettings();
    const apiKey = getStoredOpenAiApiKey(settings);
    const model = settings.ai.openai.defaultModel || DEFAULT_OPENAI_MODEL;
    const { payload } = await callOpenAiResponsesApi({
      apiKey,
      input: buildSummaryUserPrompt({
        description,
        entityType:
          typeof input?.entityType === "string" ? input.entityType.trim() : "",
        title: typeof input?.title === "string" ? input.title.trim() : "",
      }),
      instructions: buildSummarySystemPrompt(),
      model,
      requestType: "summary_generation",
    });
    const summary = extractOpenAiResponseText(payload);

    if (!summary) {
      throw new Error("OpenAI returned an empty summary. Try again with more source detail.");
    }

    return { summary };
  });

  ipcMain.handle("ai:brain-dump-preview-timeline-event", async (_event, input) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    return previewTimelineBrainDump(projectRuntime, input);
  });

  ipcMain.handle("ai:start-multi-event-timeline-job", async (_event, input) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    return startMultiEventTimelineBrainDumpJob(projectRuntime, input);
  });

  ipcMain.handle("ai:list-jobs", async () => {
    const projectRuntime = ensureCurrentProjectRuntime();
    return listAiJobs(projectRuntime);
  });

  ipcMain.handle("ai:get-job-status", async (_event, jobId) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    return getAiJobStatus(projectRuntime, String(jobId ?? ""));
  });

  ipcMain.handle("ai:cancel-job", async (_event, jobId) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    return cancelAiJob(projectRuntime, String(jobId ?? ""));
  });

  ipcMain.handle("ai:run-validation-suite", async (_event, input) => {
    return runBrainDumpValidationSuite(input ?? {});
  });

  ipcMain.handle("ai:list-validation-reports", async () => {
    const projectRuntime = ensureCurrentProjectRuntime();
    return listValidationReports(projectRuntime);
  });

  ipcMain.handle("ai:get-validation-report", async (_event, reportId) => {
    const projectRuntime = ensureCurrentProjectRuntime();
    return readValidationReport(projectRuntime, String(reportId ?? ""));
  });
}

app.whenReady().then(async () => {
  registerProtocol();
  registerIpcHandlers();

  if (RUN_VALIDATION_SUITE_CLI) {
    const budgetArg = process.argv.find((arg) => arg.startsWith("--validation-budget="));
    const titleArg = process.argv.find((arg) => arg.startsWith("--validation-project-title="));
    const budgetValue = budgetArg ? Number(budgetArg.split("=")[1]) : 10;
    const projectTitle = titleArg ? titleArg.split("=").slice(1).join("=") : "";

    try {
      const report = await runBrainDumpValidationSuite({
        budgetUsd: Number.isFinite(budgetValue) && budgetValue > 0 ? budgetValue : 10,
        sandboxProjectTitle: projectTitle,
      });
      console.log(JSON.stringify(report, null, 2));
      app.quit();
      return;
    } catch (error) {
      console.error(
        error instanceof Error
          ? `Validation suite failed: ${error.message}`
          : "Validation suite failed."
      );
      app.exit(1);
      return;
    }
  }

  if (
    RUN_DIGITAL_PRISON_BRAIN_DUMP_CLI ||
    process.env.BOOK_BIBLE_RUN_DIGITAL_PRISON_BRAINDUMPS === "1"
  ) {
    try {
      const settings = readAppSettings();
      const projectPath = settings.currentProjectPath;

      if (typeof projectPath !== "string" || !projectPath.trim()) {
        throw new Error("No current project path is configured.");
      }

      if (!fs.existsSync(projectPath)) {
        throw new Error(`Current project path does not exist: ${projectPath}`);
      }

      openProjectAtPath(projectPath);
      const projectRuntime = ensureCurrentProjectRuntime();
      const results = await runDigitalPrisonBrainDumpChecks(projectRuntime);
      const validationOutputDir = path.join(projectPath, "exports", "ai-validation");
      ensureDirectory(validationOutputDir);
      fs.writeFileSync(
        path.join(validationOutputDir, "digital-prison-brain-dump-report.json"),
        JSON.stringify(
          {
            projectPath,
            runAt: new Date().toISOString(),
            results,
          },
          null,
          2
        )
      );
      console.log(JSON.stringify(results, null, 2));
      app.quit();
      return;
    } catch (error) {
      console.error(
        error instanceof Error
          ? `Digital Prison braindump checks failed: ${error.message}`
          : "Digital Prison braindump checks failed."
      );
      app.exit(1);
      return;
    }
  }

  if (RUN_DIGITAL_PRISON_UI_CLI) {
    try {
      const settings = readAppSettings();
      const projectPath = settings.currentProjectPath;

      if (typeof projectPath !== "string" || !projectPath.trim()) {
        throw new Error("No current project path is configured.");
      }

      if (!fs.existsSync(projectPath)) {
        throw new Error(`Current project path does not exist: ${projectPath}`);
      }

      openProjectAtPath(projectPath);
      await createMainWindow();

      const projectRuntime = ensureCurrentProjectRuntime();
      const results = await runDigitalPrisonUiChecks(projectRuntime);
      const uiOutputDir = path.join(projectPath, "exports", "ai-validation");
      ensureDirectory(uiOutputDir);
      fs.writeFileSync(
        path.join(uiOutputDir, "digital-prison-ui-report.json"),
        JSON.stringify(
          {
            projectPath,
            runAt: new Date().toISOString(),
            results,
          },
          null,
          2
        )
      );
      console.log(JSON.stringify(results, null, 2));
      app.quit();
      return;
    } catch (error) {
      const debugPath = path.join(
        readAppSettings().currentProjectPath || path.join(DEFAULT_PROJECTS_ROOT, "digital-prison"),
        "exports",
        "ai-validation",
        "digital-prison-ui-debug.json"
      );

      try {
        const snapshot =
          mainWindow && !mainWindow.isDestroyed()
            ? await executeRendererScript(`({
                pathname: window.location.pathname,
                title: document.title,
                text: document.body ? document.body.innerText.slice(0, 8000) : "",
                bookBibleDebug: typeof window.__bookBibleDebug === "object" && window.__bookBibleDebug ? window.__bookBibleDebug : null,
              })`)
            : null;

        ensureDirectory(path.dirname(debugPath));
        fs.writeFileSync(
          debugPath,
          JSON.stringify(
            {
              error:
                error instanceof Error ? error.message : "Digital Prison UI checks failed.",
              snapshot,
            },
            null,
            2
          )
        );
      } catch {
        // Ignore debug-write failures; the primary error still matters.
      }

      console.error(
        error instanceof Error
          ? `Digital Prison UI checks failed: ${error.message}`
          : "Digital Prison UI checks failed."
      );
      app.exit(1);
      return;
    }
  }

  const { currentProjectPath } = readAppSettings();

  if (currentProjectPath && fs.existsSync(currentProjectPath)) {
    try {
      openProjectAtPath(currentProjectPath);
    } catch {
      clearCurrentProjectSetting();
    }
  }

  await createMainWindow();
});

app.on("window-all-closed", () => {
  if (rendererServer) {
    try {
      rendererServer.kill();
    } catch {
      // Ignore shutdown errors during app teardown.
    }
    rendererServer = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});
