import "client-only";

import type { Database } from "@/types/database";

type QueryFilter = {
  field: string;
  operator: "eq" | "in";
  value: unknown;
};

type QueryOrder = {
  ascending?: boolean;
  column: string;
};

type LocalResponse<T> = Promise<{
  data: T;
  error: Error | null;
}>;

type TableName = Extract<keyof Database["public"]["Tables"], string>;
type TableDefinition<TTableName extends TableName> = Database["public"]["Tables"][TTableName];
type TableRow<TTableName extends TableName> = TableDefinition<TTableName>["Row"];
type TableInsert<TTableName extends TableName> = TableDefinition<TTableName>["Insert"];
type TableUpdate<TTableName extends TableName> = TableDefinition<TTableName>["Update"];

const LOCAL_AUTH_USER = {
  id: "local-desktop",
  email: "local@desktop.invalid",
  user_metadata: {
    display_name: "Local Desktop User",
  },
};

class LocalQueryBuilder<
  TTableName extends TableName,
  TResult = TableRow<TTableName>[],
> {
  private columns = "*";
  private filters: QueryFilter[] = [];
  private operation: "delete" | "insert" | "select" | "update" | "upsert" = "select";
  private orderBy: QueryOrder | null = null;
  private payload: unknown = null;
  private expectSingle: "many" | "maybeSingle" | "single" = "many";

  constructor(private readonly tableName: TTableName) {}

  select(columns = "*") {
    this.columns = columns;
    this.operation = "select";
    return this as LocalQueryBuilder<TTableName, TableRow<TTableName>[]>;
  }

  insert(values: TableInsert<TTableName> | TableInsert<TTableName>[]) {
    this.operation = "insert";
    this.payload = values;
    return this as LocalQueryBuilder<TTableName, TableRow<TTableName>[]>;
  }

  update(values: TableUpdate<TTableName>) {
    this.operation = "update";
    this.payload = values;
    return this as LocalQueryBuilder<TTableName, TableRow<TTableName>[]>;
  }

  delete() {
    this.operation = "delete";
    this.payload = null;
    return this as LocalQueryBuilder<TTableName, TableRow<TTableName>[]>;
  }

  upsert(values: TableInsert<TTableName> | TableInsert<TTableName>[]) {
    this.operation = "upsert";
    this.payload = values;
    return this as LocalQueryBuilder<TTableName, TableRow<TTableName>[]>;
  }

  eq(field: string, value: unknown) {
    this.filters.push({
      field,
      operator: "eq",
      value,
    });
    return this as LocalQueryBuilder<TTableName, TResult>;
  }

  in(field: string, value: unknown[]) {
    this.filters.push({
      field,
      operator: "in",
      value,
    });
    return this as LocalQueryBuilder<TTableName, TResult>;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = {
      ascending: options?.ascending,
      column,
    };
    return this as LocalQueryBuilder<TTableName, TResult>;
  }

  maybeSingle(): LocalResponse<TableRow<TTableName> | null> {
    this.expectSingle = "maybeSingle";
    return this.execute() as LocalResponse<TableRow<TTableName> | null>;
  }

  single(): LocalResponse<TableRow<TTableName>> {
    this.expectSingle = "single";
    return this.execute() as LocalResponse<TableRow<TTableName>>;
  }

  then<TResult1 = Awaited<ReturnType<LocalQueryBuilder<TTableName, TResult>["execute"]>>, TResult2 = never>(
    onfulfilled?:
      | ((value: Awaited<ReturnType<LocalQueryBuilder<TTableName, TResult>["execute"]>>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): LocalResponse<TResult> {
    try {
      if (this.tableName === "profiles") {
        return this.executeProfilesQuery();
      }

      if (this.operation === "select") {
        const rows = await window.bookBible.records.query({
          columns: this.columns,
          filters: this.filters,
          order: this.orderBy ?? undefined,
          tableName: this.tableName,
        });
        return {
          data: this.coerceResult(rows),
          error: null,
        };
      }

      if (this.operation === "insert") {
        const rows = await window.bookBible.records.insert({
          tableName: this.tableName,
          values: this.payload,
        });
        return {
          data: this.coerceResult(rows),
          error: null,
        };
      }

      if (this.operation === "update") {
        const rows = await window.bookBible.records.update({
          filters: this.filters,
          tableName: this.tableName,
          values: (this.payload ?? {}) as Record<string, unknown>,
        });
        return {
          data: this.coerceResult(rows),
          error: null,
        };
      }

      if (this.operation === "delete") {
        const rows = await window.bookBible.records.delete({
          filters: this.filters,
          tableName: this.tableName,
        });
        return {
          data: this.coerceResult(rows),
          error: null,
        };
      }

      const rows = await window.bookBible.records.upsert({
        tableName: this.tableName,
        values: this.payload,
      });

      return {
        data: this.coerceResult(rows),
        error: null,
      };
    } catch (error) {
      return {
        data: this.coerceResult([]),
        error: error instanceof Error ? error : new Error("Desktop query failed."),
      };
    }
  }

  private async executeProfilesQuery(): LocalResponse<TResult> {
    try {
      const currentProject = await window.bookBible.project.getCurrent();
      const now = new Date().toISOString();
      const profile = {
        id: "local-desktop",
        email: "local@desktop.invalid",
        display_name: "Local Desktop User",
        role: "owner",
        plan: "desktop",
        status: "active",
        active_project_id: currentProject?.id ?? null,
        ai_creative_enabled: true,
        ai_organizational_enabled: true,
        openai_api_key_encrypted: null,
        openai_api_key_last4: null,
        openai_api_key_updated_at: null,
        created_at: now,
        updated_at: now,
        last_login_at: now,
      } as TableRow<"profiles">;

      return {
        data: this.coerceResult([profile]),
        error: null,
      };
    } catch (error) {
      return {
        data: this.coerceResult([]),
        error: error instanceof Error ? error : new Error("Unable to read local profile."),
      };
    }
  }

  private coerceResult(rows: unknown): TResult {
    const normalizedRows = (Array.isArray(rows) ? rows : []) as TableRow<TTableName>[];

    if (this.expectSingle === "many") {
      return normalizedRows as TResult;
    }

    const singleRow = normalizedRows[0] ?? null;

    if (this.expectSingle === "single" && !singleRow) {
      throw new Error("Expected a single row but none were returned.");
    }

    return singleRow as TResult;
  }
}

function createLocalStorageClient(bucketId: string) {
  return {
    async createSignedUrl(storagePath: string, _expiresInSeconds?: number) {
      const signedUrl = await window.bookBible.attachments.createPreviewUrl(bucketId, storagePath);

      return {
        data: {
          signedUrl,
        },
        error: null,
      };
    },

    async remove(storagePaths: string[]) {
      try {
        await window.bookBible.attachments.remove({
          bucketId,
          storagePaths,
        });

        return {
          data: null,
          error: null,
        };
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error : new Error("Unable to remove attachment file."),
        };
      }
    },

    async upload(
      storagePath: string,
      file: File,
      options?: { cacheControl?: string; contentType?: string; upsert?: boolean }
    ) {
      try {
        const fileBuffer = await file.arrayBuffer();

        await window.bookBible.attachments.upload({
          bucketId,
          contentType: options?.contentType ?? file.type,
          data: new Uint8Array(fileBuffer),
          storagePath,
        });

        return {
          data: {
            path: storagePath,
          },
          error: null,
        };
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error : new Error("Unable to upload attachment file."),
        };
      }
    },
  };
}

const localSupabaseClient = {
  auth: {
    async getUser() {
      return {
        data: {
          user: LOCAL_AUTH_USER,
        },
        error: null,
      };
    },
    onAuthStateChange(callback: (event: string, session: { user: typeof LOCAL_AUTH_USER } | null) => void) {
      callback("SIGNED_IN", {
        user: LOCAL_AUTH_USER,
      });

      return {
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      };
    },
    async signInWithPassword() {
      return {
        data: {
          session: {
            user: LOCAL_AUTH_USER,
          },
          user: LOCAL_AUTH_USER,
        },
        error: null,
      };
    },
    async signOut() {
      return {
        error: null,
      };
    },
    async signUp() {
      return {
        data: {
          session: {
            user: LOCAL_AUTH_USER,
          },
          user: LOCAL_AUTH_USER,
        },
        error: null,
      };
    },
  },
  from<TTableName extends TableName>(tableName: TTableName) {
    return new LocalQueryBuilder(tableName);
  },
  storage: {
    from(bucketId: string) {
      return createLocalStorageClient(bucketId);
    },
  },
};

export function getSupabaseBrowserClient() {
  return localSupabaseClient;
}
