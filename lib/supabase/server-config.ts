import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type SupabaseServerConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

type SupabaseAdminConfig = SupabaseServerConfig & {
  supabaseServiceRoleKey: string;
};

let hasLoadedLocalEnv = false;

function parseEnvFileValue(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
}

function loadEnvFileIntoProcess(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const fileContents = readFileSync(filePath, "utf8");

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || process.env[key]) {
      continue;
    }

    const value = parseEnvFileValue(line.slice(separatorIndex + 1));
    process.env[key] = value;
  }
}

function ensureSupabaseServerEnv() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  ) {
    return;
  }

  if (!hasLoadedLocalEnv) {
    loadEnvFileIntoProcess(join(process.cwd(), ".env.local"));
    loadEnvFileIntoProcess(join(process.cwd(), ".env"));
    hasLoadedLocalEnv = true;
  }
}

export function getSupabaseServerConfig(): SupabaseServerConfig {
  ensureSupabaseServerEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  if (!supabasePublishableKey) {
    throw new Error(
      "Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY."
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig {
  const baseConfig = getSupabaseServerConfig();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase environment variable: SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return {
    ...baseConfig,
    supabaseServiceRoleKey,
  };
}
