import "server-only";

import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServerConfig } from "@/lib/supabase/server-config";
import type { Database } from "@/types/database";

type AuthenticatedProfileSecurityContext = {
  supabase: SupabaseClient<Database>;
  user: User;
};

type ProjectDeletionInput = {
  password: string;
  projectId: string;
};

type AccountDeletionInput = {
  password: string;
};

type AttachmentStorageRecord = {
  bucket: string;
  path: string;
};

export type ProjectDeletionResult = {
  deletedProjectId: string;
  deletedProjectTitle: string;
  nextActiveProjectId: string | null;
  redirectTo: string | null;
  remainingProjectCount: number;
  wasActiveProject: boolean;
};

export type AccountDeletionResult = {
  redirectTo: string;
};

export class ProfileSecurityError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ProfileSecurityError";
    this.status = status;
  }
}

export async function deleteProjectForAuthenticatedUser({
  password,
  projectId,
}: ProjectDeletionInput): Promise<ProjectDeletionResult> {
  const normalizedProjectId = projectId.trim();

  if (!normalizedProjectId) {
    throw new ProfileSecurityError("Choose a project to delete.");
  }

  const { supabase, user } = await readAuthenticatedProfileSecurityContext();
  await verifyCurrentPasswordForUser(user, password);

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("user_id", user.id)
    .eq("id", normalizedProjectId)
    .maybeSingle();

  if (projectError) {
    throw new ProfileSecurityError(projectError.message, 500);
  }

  if (!projectRow) {
    throw new ProfileSecurityError("Project not found for this account.", 404);
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("active_project_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new ProfileSecurityError(profileError.message, 500);
  }

  const { data: remainingProjectRows, error: remainingProjectsError } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .neq("id", normalizedProjectId)
    .order("created_at", { ascending: true });

  if (remainingProjectsError) {
    throw new ProfileSecurityError(remainingProjectsError.message, 500);
  }

  const storageRecords = await listAttachmentStorageRecords({
    supabase,
    uid: user.id,
    projectId: normalizedProjectId,
  });

  await removeAttachmentStorageRecords(supabase, storageRecords);

  const { error: deleteProjectError } = await supabase
    .from("projects")
    .delete()
    .eq("user_id", user.id)
    .eq("id", normalizedProjectId);

  if (deleteProjectError) {
    throw new ProfileSecurityError(deleteProjectError.message, 500);
  }

  const wasActiveProject = profileRow?.active_project_id === normalizedProjectId;
  const nextActiveProjectId = wasActiveProject
    ? remainingProjectRows?.[0]?.id ?? null
    : profileRow?.active_project_id ?? null;

  if (wasActiveProject) {
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        active_project_id: nextActiveProjectId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateProfileError) {
      throw new ProfileSecurityError(
        `Deleted the project, but could not update the active project pointer: ${updateProfileError.message}`,
        500
      );
    }
  }

  return {
    deletedProjectId: projectRow.id,
    deletedProjectTitle: projectRow.title,
    nextActiveProjectId,
    redirectTo: wasActiveProject
      ? nextActiveProjectId
        ? "/timeline"
        : "/projects/new"
      : null,
    remainingProjectCount: remainingProjectRows?.length ?? 0,
    wasActiveProject,
  };
}

export async function deleteAuthenticatedUserAccount({
  password,
}: AccountDeletionInput): Promise<AccountDeletionResult> {
  const { supabase, user } = await readAuthenticatedProfileSecurityContext();
  await verifyCurrentPasswordForUser(user, password);

  const storageRecords = await listAttachmentStorageRecords({
    supabase,
    uid: user.id,
  });

  await removeAttachmentStorageRecords(supabase, storageRecords);

  const adminSupabase = getSupabaseAdminClient();
  const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    throw new ProfileSecurityError(deleteUserError.message, 500);
  }

  return {
    redirectTo: "/auth?mode=sign-up",
  };
}

async function readAuthenticatedProfileSecurityContext(): Promise<AuthenticatedProfileSecurityContext> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ProfileSecurityError(
      "Sign in before using security settings.",
      401
    );
  }

  return {
    supabase,
    user,
  };
}

async function verifyCurrentPasswordForUser(user: User, password: string) {
  const normalizedPassword = password.trim();

  if (!normalizedPassword) {
    throw new ProfileSecurityError("Enter your current password.");
  }

  if (!user.email) {
    throw new ProfileSecurityError(
      "This account does not have a password-enabled email address."
    );
  }

  const verifier = createPasswordVerificationClient();
  const { data, error } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: normalizedPassword,
  });

  await verifier.auth.signOut().catch(() => undefined);

  if (error || data.user?.id !== user.id) {
    throw new ProfileSecurityError("Current password is incorrect.", 401);
  }
}

function createPasswordVerificationClient() {
  const { supabasePublishableKey, supabaseUrl } = getSupabaseServerConfig();

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function listAttachmentStorageRecords({
  supabase,
  uid,
  projectId,
}: {
  supabase: SupabaseClient<Database>;
  uid: string;
  projectId?: string;
}) {
  let query = supabase
    .from("attachments")
    .select("storage_bucket, storage_path")
    .eq("user_id", uid)
    .not("storage_bucket", "is", null)
    .not("storage_path", "is", null);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw new ProfileSecurityError(error.message, 500);
  }

  const uniqueRecords = new Map<string, AttachmentStorageRecord>();

  for (const row of data ?? []) {
    if (!row.storage_bucket || !row.storage_path) {
      continue;
    }

    const key = `${row.storage_bucket}:${row.storage_path}`;
    uniqueRecords.set(key, {
      bucket: row.storage_bucket,
      path: row.storage_path,
    });
  }

  return Array.from(uniqueRecords.values());
}

async function removeAttachmentStorageRecords(
  supabase: SupabaseClient<Database>,
  records: AttachmentStorageRecord[]
) {
  if (records.length === 0) {
    return;
  }

  const pathsByBucket = new Map<string, string[]>();

  for (const record of records) {
    const bucketPaths = pathsByBucket.get(record.bucket) ?? [];
    bucketPaths.push(record.path);
    pathsByBucket.set(record.bucket, bucketPaths);
  }

  for (const [bucket, paths] of pathsByBucket) {
    for (let index = 0; index < paths.length; index += 100) {
      const batch = paths.slice(index, index + 100);
      const { error } = await supabase.storage.from(bucket).remove(batch);

      if (error) {
        throw new ProfileSecurityError(
          `Unable to delete stored files from ${bucket}: ${error.message}`,
          500
        );
      }
    }
  }
}
