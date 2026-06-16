const { contextBridge, ipcRenderer } = require("electron");

let spellCheckerPromise = null;

async function loadSpellChecker() {
  if (!spellCheckerPromise) {
    spellCheckerPromise = Promise.all([import("nspell"), import("dictionary-en")])
      .then(([nspellModule, dictionaryModule]) => {
        const createSpellChecker = nspellModule.default;
        const dictionary = dictionaryModule.default;

        if (typeof createSpellChecker !== "function" || !dictionary) {
          throw new Error("Dictionary spell checker could not be initialized.");
        }

        return createSpellChecker(dictionary);
      })
      .catch((error) => {
        spellCheckerPromise = null;
        console.error("[book-bible] failed to load dictionary spellchecker", error);
        return null;
      });
  }

  return spellCheckerPromise;
}

function createSubscription(channelName) {
  return (listener) => {
    const wrappedListener = () => {
      listener();
    };

    ipcRenderer.on(channelName, wrappedListener);

    return () => {
      ipcRenderer.removeListener(channelName, wrappedListener);
    };
  };
}

contextBridge.exposeInMainWorld("bookBible", {
  app: {
    getSettings: () => ipcRenderer.invoke("app:get-settings"),
    setAutoCorrectTyping: (enabled) => ipcRenderer.invoke("app:set-auto-correct-typing", enabled),
    addPenName: (penName) => ipcRenderer.invoke("app:add-pen-name", penName),
    setDefaultPenName: (penName) => ipcRenderer.invoke("app:set-default-pen-name", penName),
    updateProfileInfo: (input) => ipcRenderer.invoke("app:update-profile-info", input),
    subscribeSettings: createSubscription("app:settings:changed"),
  },
  launcher: {
    createProject: (input) => ipcRenderer.invoke("launcher:create-project", input),
    listRecentProjects: () => ipcRenderer.invoke("launcher:list-recent-projects"),
    listRecentProjectsSync: () => ipcRenderer.sendSync("launcher:list-recent-projects-sync"),
    openExistingProject: () => ipcRenderer.invoke("launcher:open-existing-project"),
    openProjectAtPath: (projectPath) =>
      ipcRenderer.invoke("launcher:open-project-at-path", projectPath),
    removeRecentProject: (projectPath) =>
      ipcRenderer.invoke("launcher:remove-recent-project", projectPath),
    revealProject: (projectPath) => ipcRenderer.invoke("launcher:reveal-project", projectPath),
  },
  project: {
    backupCurrent: () => ipcRenderer.invoke("project:backup-current"),
    deleteCurrent: () => ipcRenderer.invoke("project:delete-current"),
    close: () => ipcRenderer.invoke("project:close"),
    getCurrent: () => ipcRenderer.invoke("project:get-current"),
    getCurrentSync: () => ipcRenderer.sendSync("project:get-current-sync"),
    rename: (title) => ipcRenderer.invoke("project:rename", title),
    subscribe: createSubscription("project:changed"),
  },
  records: {
    delete: (input) => ipcRenderer.invoke("records:delete", input),
    insert: (input) => ipcRenderer.invoke("records:insert", input),
    query: (input) => ipcRenderer.invoke("records:query", input),
    update: (input) => ipcRenderer.invoke("records:update", input),
    upsert: (input) => ipcRenderer.invoke("records:upsert", input),
  },
  attachments: {
    createPreviewUrl: (bucketId, storagePath) =>
      ipcRenderer.invoke("attachments:create-preview-url", { bucketId, storagePath }),
    remove: (input) => ipcRenderer.invoke("attachments:remove", input),
    writeDocument: (input) => ipcRenderer.invoke("attachments:write-document", input),
    upload: (input) => ipcRenderer.invoke("attachments:upload", input),
  },
  spellcheck: {
    correct: async (word) => {
      const spellChecker = await loadSpellChecker();
      return spellChecker ? spellChecker.correct(String(word ?? "")) : false;
    },
    suggest: async (word) => {
      const spellChecker = await loadSpellChecker();
      return spellChecker ? spellChecker.suggest(String(word ?? "")) : [];
    },
  },
  drafts: {
    apply: (draftId) => ipcRenderer.invoke("drafts:apply", draftId),
    approve: (draftId) => ipcRenderer.invoke("drafts:approve", draftId),
    get: (draftId) => ipcRenderer.invoke("drafts:get", draftId),
    list: () => ipcRenderer.invoke("drafts:list"),
    reject: (draftId) => ipcRenderer.invoke("drafts:reject", draftId),
    save: (input) => ipcRenderer.invoke("drafts:save", input),
    subscribe: createSubscription("drafts:changed"),
  },
  manuscript: {
    openWindow: (routePath) => ipcRenderer.invoke("manuscript:open-window", routePath),
  },
  exports: {
    getStatus: () => ipcRenderer.invoke("exports:get-status"),
    regenerate: () => ipcRenderer.invoke("exports:regenerate"),
  },
  ai: {
    getConfig: () => ipcRenderer.invoke("ai:get-config"),
    getDashboard: (input) => ipcRenderer.invoke("ai:get-dashboard", input),
    listOpenAiKeys: () => ipcRenderer.invoke("ai:list-openai-keys"),
    setOpenAiKey: (apiKey, label) => ipcRenderer.invoke("ai:set-openai-key", apiKey, label),
    addOpenAiKey: (apiKey, label) => ipcRenderer.invoke("ai:add-openai-key", apiKey, label),
    setActiveOpenAiKey: (keyId) => ipcRenderer.invoke("ai:set-active-openai-key", keyId),
    removeOpenAiKey: (keyId) => ipcRenderer.invoke("ai:remove-openai-key", keyId),
    subscribeConfig: createSubscription("ai:config:changed"),
    subscribeUsage: createSubscription("ai:usage:changed"),
    generateSummary: (input) => ipcRenderer.invoke("ai:generate-summary", input),
    previewTimelineBrainDump: (input) =>
      ipcRenderer.invoke("ai:brain-dump-preview-timeline-event", input),
    startMultiEventTimelineBrainDumpJob: (input) =>
      ipcRenderer.invoke("ai:start-multi-event-timeline-job", input),
    listJobs: () => ipcRenderer.invoke("ai:list-jobs"),
    getJobStatus: (jobId) => ipcRenderer.invoke("ai:get-job-status", jobId),
    updateJobReviewState: (input) => ipcRenderer.invoke("ai:update-job-review-state", input),
    cancelJob: (jobId) => ipcRenderer.invoke("ai:cancel-job", jobId),
    subscribeJobs: createSubscription("ai:jobs:changed"),
    runBrainDumpValidationSuite: (input) =>
      ipcRenderer.invoke("ai:run-validation-suite", input),
    runHardTimeBrainDumpRegressionSuite: (input) =>
      ipcRenderer.invoke("ai:run-hard-time-brain-dump-regression-suite", input),
    listValidationReports: () => ipcRenderer.invoke("ai:list-validation-reports"),
    getValidationReport: (reportId) => ipcRenderer.invoke("ai:get-validation-report", reportId),
  },
});
