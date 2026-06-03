const { contextBridge, ipcRenderer } = require("electron");

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
    upload: (input) => ipcRenderer.invoke("attachments:upload", input),
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
    cancelJob: (jobId) => ipcRenderer.invoke("ai:cancel-job", jobId),
    subscribeJobs: createSubscription("ai:jobs:changed"),
    runBrainDumpValidationSuite: (input) =>
      ipcRenderer.invoke("ai:run-validation-suite", input),
    listValidationReports: () => ipcRenderer.invoke("ai:list-validation-reports"),
    getValidationReport: (reportId) => ipcRenderer.invoke("ai:get-validation-report", reportId),
  },
});
