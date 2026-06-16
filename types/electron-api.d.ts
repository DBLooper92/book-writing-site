import type { Json } from "@/types/database";
import type {
  BrainDumpValidationReport,
  BrainDumpRegressionReport,
  AiJobSummary,
  AiMultiEventJobRecord,
  BrainDumpPreviewResult,
  MultiEventJobReviewState,
  TimelineBrainDumpProjectContext,
} from "@/types/ai-brain-dump";

export type DesktopRecentProject = {
  id: string;
  title: string;
  path: string;
  lastOpenedAt: string;
  missing: boolean;
};

export type DesktopProjectRecord = {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  description: string | null;
  genre: string | null;
  tone: string | null;
  themes: string[];
  timeline_start_year: number | null;
  timeline_end_year: number | null;
  default_calendar_system_id: string | null;
  primary_point_of_view_style: string | null;
  writing_status: string | null;
  book_order_mode: string | null;
  notes_root_id: string | null;
  settings: Json;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DesktopCurrentProject = {
  id: string;
  title: string;
  slug: string;
  path: string;
  manifest: Json;
  projectRecord: DesktopProjectRecord;
  folders: {
    attachments: string;
    exports: string;
    inbox: string;
    prompts: string;
    proposals: string;
  };
};

export type DesktopDraftListItem = {
  createdAt: string | null;
  draftId: string;
  errors: string[];
  fileName: string;
  projectId: string | null;
  proposedChangeCount: number;
  sourceFile: string | null;
  status: string;
  summary: string;
  valid: boolean;
};

export type DesktopDraftDetail = DesktopDraftListItem & {
  draft: Record<string, unknown> | null;
  rawText: string;
  relativePath: string;
};

export type BookBibleProfileSettings = {
  defaultPenName: string | null;
  firstName: string | null;
  lastName: string | null;
  penNames: string[];
};

export type BookBibleAppSettings = {
  autoCorrectTyping: boolean;
  profile: BookBibleProfileSettings;
};

export type BookBibleElectronApi = {
  app: {
    getSettings(): Promise<BookBibleAppSettings>;
    setAutoCorrectTyping(enabled: boolean): Promise<BookBibleAppSettings>;
    addPenName(penName: string): Promise<BookBibleAppSettings>;
    setDefaultPenName(penName: string): Promise<BookBibleAppSettings>;
    updateProfileInfo(input: {
      firstName: string;
      lastName: string;
    }): Promise<BookBibleAppSettings>;
    subscribeSettings(listener: () => void): () => void;
  };
  launcher: {
    createProject(input: { title: string }): Promise<DesktopCurrentProject>;
    listRecentProjects(): Promise<DesktopRecentProject[]>;
    listRecentProjectsSync(): DesktopRecentProject[];
    openExistingProject(): Promise<DesktopCurrentProject | null>;
    openProjectAtPath(projectPath: string): Promise<DesktopCurrentProject>;
    removeRecentProject(projectPath: string): Promise<void>;
    revealProject(projectPath?: string | null): Promise<void>;
  };
  project: {
    backupCurrent(): Promise<{ canceled: boolean; filePath: string | null }>;
    deleteCurrent(): Promise<void>;
    close(): Promise<void>;
    getCurrent(): Promise<DesktopCurrentProject | null>;
    getCurrentSync(): DesktopCurrentProject | null;
    rename(title: string): Promise<DesktopCurrentProject>;
    subscribe(listener: () => void): () => void;
  };
  records: {
    delete(input: {
      filters?: Array<{ field: string; operator: "eq" | "in"; value: unknown }>;
      tableName: string;
    }): Promise<unknown[]>;
    insert(input: { tableName: string; values: unknown | unknown[] }): Promise<unknown[]>;
    query(input: {
      columns?: string;
      filters?: Array<{ field: string; operator: "eq" | "in"; value: unknown }>;
      order?: { ascending?: boolean; column: string };
      tableName: string;
    }): Promise<unknown[]>;
    update(input: {
      filters?: Array<{ field: string; operator: "eq" | "in"; value: unknown }>;
      tableName: string;
      values: Record<string, unknown>;
    }): Promise<unknown[]>;
    upsert(input: { tableName: string; values: unknown | unknown[] }): Promise<unknown[]>;
  };
  attachments: {
    createPreviewUrl(bucketId: string, storagePath: string): Promise<string>;
    remove(input: { bucketId: string; storagePaths: string[] }): Promise<void>;
    writeDocument(input: {
      bucketId: string;
      bodyText: string;
      storagePath: string;
    }): Promise<{ fileSizeBytes: number }>;
    upload(input: {
      bucketId: string;
      contentType?: string | null;
      data: Uint8Array;
      storagePath: string;
    }): Promise<void>;
  };
  spellcheck: {
    correct(word: string): Promise<boolean>;
    suggest(word: string): Promise<string[]>;
  };
  drafts: {
    apply(draftId: string): Promise<DesktopDraftDetail>;
    approve(draftId: string): Promise<DesktopDraftDetail>;
    get(draftId: string): Promise<DesktopDraftDetail | null>;
    list(): Promise<DesktopDraftListItem[]>;
    reject(draftId: string): Promise<DesktopDraftDetail>;
    save(input: { draftId: string; rawText: string }): Promise<DesktopDraftDetail>;
    subscribe(listener: () => void): () => void;
  };
  manuscript: {
    openWindow(routePath?: string): Promise<void>;
  };
  exports: {
    getStatus(): Promise<{ lastExportAt: string | null }>;
    regenerate(): Promise<{ lastExportAt: string | null }>;
  };
  ai: {
    getConfig(): Promise<{
      openai: {
        configured: boolean;
        defaultModel: string;
        activeKeyId: string | null;
        keys: Array<{
          active: boolean;
          createdAt: string;
          fingerprint: string;
          label: string;
          last4: string;
          updatedAt: string;
        }>;
        last4: string | null;
        updatedAt: string | null;
      };
    }>;
    getDashboard(input: {
      rangePreset?: "7d" | "30d" | "90d" | "all";
      scope?: "all" | "active" | string;
    }): Promise<{
      openai: {
        configured: boolean;
        defaultModel: string;
        activeKeyId: string | null;
        keys: Array<{
          active: boolean;
          createdAt: string;
          fingerprint: string;
          label: string;
          last4: string;
          updatedAt: string;
        }>;
        last4: string | null;
        updatedAt: string | null;
      };
      usage: {
        activeKey: {
          active: boolean;
          createdAt: string;
          fingerprint: string;
          label: string;
          last4: string;
          updatedAt: string;
        } | null;
        keys: Array<{
          active: boolean;
          apiKeyFingerprint: string;
          apiKeyLabel: string;
          apiKeyLast4: string;
          createdAt: string;
          requestCount: number;
          totalSpendUsd: number;
          totalTokens: number;
        }>;
        pricingKnown: boolean;
        range: {
          preset: string;
          sinceIso: string | null;
        };
        summary: {
          averageSpendUsd: number;
          averageTokens: number;
          pricingKnown: boolean;
          requestCount: number;
          totalSpendUsd: number;
          totalTokens: number;
        };
        timeline: Array<{
          averageSpendUsd: number;
          date: string;
          requestCount: number;
          totalSpendUsd: number;
          totalTokens: number;
        }>;
      };
    }>;
    listOpenAiKeys(): Promise<Array<{
      active: boolean;
      createdAt: string;
      fingerprint: string;
      label: string;
      last4: string;
      updatedAt: string;
    }>>;
    setOpenAiKey(apiKey: string, label?: string): Promise<{ fingerprint: string; last4: string; updatedAt: string }>;
    addOpenAiKey(apiKey: string, label?: string): Promise<{ fingerprint: string; last4: string; updatedAt: string }>;
    setActiveOpenAiKey(keyId: string): Promise<void>;
    removeOpenAiKey(keyId?: string): Promise<void>;
    subscribeConfig(listener: () => void): () => void;
    subscribeUsage(listener: () => void): () => void;
    generateSummary(input: {
      description: string;
      entityType?: string;
      title?: string;
    }): Promise<{ summary: string }>;
    previewTimelineBrainDump(input: {
      brainDumpText: string;
      projectContext?: TimelineBrainDumpProjectContext;
    }): Promise<BrainDumpPreviewResult>;
    startMultiEventTimelineBrainDumpJob(input: {
      brainDumpText: string;
      timelineInsertionItemId?: string;
      projectContext?: TimelineBrainDumpProjectContext;
      projectTitle?: string;
    }): Promise<{ jobId: string; status: string }>;
    listJobs(): Promise<AiJobSummary[]>;
    getJobStatus(jobId: string): Promise<AiMultiEventJobRecord | null>;
    updateJobReviewState(input: {
      jobId: string;
      reviewState: MultiEventJobReviewState | null;
    }): Promise<AiMultiEventJobRecord | null>;
    cancelJob(jobId: string): Promise<AiMultiEventJobRecord | null>;
    subscribeJobs(listener: () => void): () => void;
    runBrainDumpValidationSuite(input?: {
      budgetUsd?: number;
      sandboxProjectTitle?: string;
    }): Promise<BrainDumpValidationReport>;
    runHardTimeBrainDumpRegressionSuite(input?: {
      sandboxRoot?: string;
      sourceProjectPath?: string;
    }): Promise<BrainDumpRegressionReport>;
    listValidationReports(): Promise<
      Array<{
        createdAt: string;
        id: string;
        path: string;
        projectId: string;
      }>
    >;
    getValidationReport(reportId: string): Promise<BrainDumpValidationReport | null>;
  };
};

declare global {
  interface Window {
    bookBible: BookBibleElectronApi;
  }
}

export {};
