const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BetterSqlite3 = require("better-sqlite3");
const { app } = require("electron");

const OPENAI_STORE_FILE = "openai-account.sqlite";

let storeDb = null;

const OPENAI_MODEL_PRICING = {
  "gpt-4.1": {
    cachedInputPerMillion: 0.75,
    inputPerMillion: 3,
    outputPerMillion: 12,
  },
  "gpt-4.1-mini": {
    cachedInputPerMillion: 0.1,
    inputPerMillion: 0.4,
    outputPerMillion: 1.6,
  },
  "gpt-4.1-nano": {
    cachedInputPerMillion: 0.05,
    inputPerMillion: 0.2,
    outputPerMillion: 0.8,
  },
  "gpt-5": {
    cachedInputPerMillion: 0.125,
    inputPerMillion: 1.25,
    outputPerMillion: 10,
  },
  "gpt-5-mini": {
    cachedInputPerMillion: 0.025,
    inputPerMillion: 0.25,
    outputPerMillion: 2,
  },
  "gpt-5-nano": {
    cachedInputPerMillion: 0.005,
    inputPerMillion: 0.05,
    outputPerMillion: 0.4,
  },
  "gpt-5-pro": {
    cachedInputPerMillion: null,
    inputPerMillion: 15,
    outputPerMillion: 120,
  },
};

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function getStorePath() {
  ensureDirectory(app.getPath("userData"));
  return path.join(app.getPath("userData"), OPENAI_STORE_FILE);
}

function getOpenAiStoreDb() {
  if (storeDb) {
    return storeDb;
  }

  storeDb = new BetterSqlite3(getStorePath());
  storeDb.pragma("journal_mode = WAL");
  storeDb.pragma("foreign_keys = ON");
  ensureOpenAiStoreSchema(storeDb);
  return storeDb;
}

function ensureOpenAiStoreSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS openai_keys (
      fingerprint TEXT PRIMARY KEY,
      label TEXT,
      encrypted_key TEXT NOT NULL,
      last4 TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_openai_keys_active
      ON openai_keys (is_active, updated_at DESC);

    CREATE TABLE IF NOT EXISTS openai_usage_events (
      id TEXT PRIMARY KEY,
      api_key_fingerprint TEXT NOT NULL,
      api_key_label TEXT,
      api_key_last4 TEXT NOT NULL,
      model TEXT NOT NULL,
      request_type TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      cached_input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      estimated_cost_usd REAL NOT NULL,
      pricing_known INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_openai_usage_events_created_at
      ON openai_usage_events (created_at);

    CREATE INDEX IF NOT EXISTS idx_openai_usage_events_fingerprint
      ON openai_usage_events (api_key_fingerprint, created_at);
  `);
}

function createKeyFingerprint(apiKey) {
  return crypto.createHash("sha256").update(String(apiKey ?? "")).digest("hex");
}

function normalizeKeyLabel(label, last4) {
  const trimmed = String(label ?? "").trim();

  if (trimmed) {
    return trimmed;
  }

  return `OpenAI key ****${last4}`;
}

function upsertOpenAiKey({
  encryptedKey,
  fingerprint,
  label,
  last4,
  makeActive = true,
  createdAt = new Date().toISOString(),
  updatedAt = new Date().toISOString(),
}) {
  const db = getOpenAiStoreDb();
  const existing = db
    .prepare("SELECT created_at FROM openai_keys WHERE fingerprint = ?")
    .get(fingerprint);

  const record = {
    created_at: existing?.created_at ?? createdAt,
    encrypted_key: encryptedKey,
    fingerprint,
    is_active: makeActive ? 1 : 0,
    label: normalizeKeyLabel(label, last4),
    last4,
    updated_at: updatedAt,
  };

  db.prepare(
    `INSERT OR REPLACE INTO openai_keys
      (fingerprint, label, encrypted_key, last4, is_active, created_at, updated_at)
     VALUES
      (@fingerprint, @label, @encrypted_key, @last4, @is_active, @created_at, @updated_at)`
  ).run(record);

  if (makeActive) {
    setActiveOpenAiKey(fingerprint);
  }

  return getOpenAiKeyByFingerprint(fingerprint);
}

function setActiveOpenAiKey(fingerprint) {
  const db = getOpenAiStoreDb();
  const matchingKey = db
    .prepare("SELECT fingerprint FROM openai_keys WHERE fingerprint = ?")
    .get(fingerprint);

  if (!matchingKey) {
    return null;
  }

  db.prepare("UPDATE openai_keys SET is_active = 0").run();
  db.prepare("UPDATE openai_keys SET is_active = 1, updated_at = ? WHERE fingerprint = ?").run(
    new Date().toISOString(),
    fingerprint
  );

  return getOpenAiKeyByFingerprint(fingerprint);
}

function removeOpenAiKey(fingerprint) {
  const db = getOpenAiStoreDb();
  const removed = db.prepare("SELECT * FROM openai_keys WHERE fingerprint = ?").get(fingerprint);

  if (!removed) {
    return null;
  }

  db.prepare("DELETE FROM openai_keys WHERE fingerprint = ?").run(fingerprint);

  const remaining = db
    .prepare("SELECT fingerprint FROM openai_keys ORDER BY is_active DESC, updated_at DESC")
    .all();

  if (remaining.length > 0) {
    setActiveOpenAiKey(remaining[0].fingerprint);
  }

  return removed;
}

function listOpenAiKeys() {
  const db = getOpenAiStoreDb();
  return db
    .prepare(
      `SELECT fingerprint, label, last4, is_active, created_at, updated_at
       FROM openai_keys
       ORDER BY is_active DESC, updated_at DESC`
    )
    .all()
    .map((row) => ({
      active: Boolean(row.is_active),
      createdAt: row.created_at,
      fingerprint: row.fingerprint,
      label: row.label,
      last4: row.last4,
      updatedAt: row.updated_at,
    }));
}

function getOpenAiKeyByFingerprint(fingerprint) {
  const db = getOpenAiStoreDb();
  const row = db
    .prepare(
      `SELECT fingerprint, label, last4, is_active, created_at, updated_at
       FROM openai_keys
       WHERE fingerprint = ?`
    )
    .get(fingerprint);

  if (!row) {
    return null;
  }

  return {
    active: Boolean(row.is_active),
    createdAt: row.created_at,
    fingerprint: row.fingerprint,
    label: row.label,
    last4: row.last4,
    updatedAt: row.updated_at,
  };
}

function getActiveOpenAiKey() {
  const db = getOpenAiStoreDb();
  const row = db
    .prepare(
      `SELECT fingerprint, label, last4, is_active, created_at, updated_at
       FROM openai_keys
       WHERE is_active = 1
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .get();

  if (!row) {
    const fallback = db
      .prepare(
        `SELECT fingerprint, label, last4, is_active, created_at, updated_at
         FROM openai_keys
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get();

    if (!fallback) {
      return null;
    }

    return {
      active: Boolean(fallback.is_active),
      createdAt: fallback.created_at,
      fingerprint: fallback.fingerprint,
      label: fallback.label,
      last4: fallback.last4,
      updatedAt: fallback.updated_at,
    };
  }

  return {
    active: Boolean(row.is_active),
    createdAt: row.created_at,
    fingerprint: row.fingerprint,
    label: row.label,
    last4: row.last4,
    updatedAt: row.updated_at,
  };
}

function getOpenAiKeyRecordByFingerprint(fingerprint) {
  const db = getOpenAiStoreDb();
  const row = db
    .prepare(
      `SELECT fingerprint, label, encrypted_key, last4, is_active, created_at, updated_at
       FROM openai_keys
       WHERE fingerprint = ?`
    )
    .get(fingerprint);

  if (!row) {
    return null;
  }

  return row;
}

function hasOpenAiKeys() {
  const db = getOpenAiStoreDb();
  const row = db.prepare("SELECT COUNT(*) AS count FROM openai_keys").get();
  return Number(row?.count ?? 0) > 0;
}

function countOpenAiKeys() {
  const db = getOpenAiStoreDb();
  const row = db.prepare("SELECT COUNT(*) AS count FROM openai_keys").get();
  return Number(row?.count ?? 0);
}

function resolveOpenAiPricing(model) {
  const normalized = String(model ?? "").trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const direct = OPENAI_MODEL_PRICING[normalized];

  if (direct) {
    return direct;
  }

  if (normalized.startsWith("gpt-4.1-mini")) {
    return OPENAI_MODEL_PRICING["gpt-4.1-mini"];
  }

  if (normalized.startsWith("gpt-4.1-nano")) {
    return OPENAI_MODEL_PRICING["gpt-4.1-nano"];
  }

  if (normalized.startsWith("gpt-4.1")) {
    return OPENAI_MODEL_PRICING["gpt-4.1"];
  }

  if (normalized.startsWith("gpt-5-pro")) {
    return OPENAI_MODEL_PRICING["gpt-5-pro"];
  }

  if (normalized.startsWith("gpt-5-mini")) {
    return OPENAI_MODEL_PRICING["gpt-5-mini"];
  }

  if (normalized.startsWith("gpt-5-nano")) {
    return OPENAI_MODEL_PRICING["gpt-5-nano"];
  }

  if (normalized.startsWith("gpt-5")) {
    return OPENAI_MODEL_PRICING["gpt-5"];
  }

  return null;
}

function normalizeTokenCount(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function estimateOpenAiUsageCost(model, usage) {
  const pricing = resolveOpenAiPricing(model);
  const inputTokens = normalizeTokenCount(usage?.inputTokens ?? usage?.promptTokens ?? usage?.input_tokens);
  const cachedInputTokens = Math.min(
    inputTokens,
    normalizeTokenCount(
      usage?.cachedInputTokens ??
        usage?.cached_input_tokens ??
        usage?.promptTokensCached ??
        usage?.input_tokens_details?.cached_tokens
    )
  );
  const outputTokens = normalizeTokenCount(usage?.outputTokens ?? usage?.output_tokens);

  if (!pricing) {
    return {
      pricingKnown: false,
      totalCostUsd: 0,
    };
  }

  const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  const cachedRate =
    typeof pricing.cachedInputPerMillion === "number" ? pricing.cachedInputPerMillion : pricing.inputPerMillion;
  const totalCostUsd =
    (uncachedInputTokens * pricing.inputPerMillion +
      cachedInputTokens * cachedRate +
      outputTokens * pricing.outputPerMillion) /
    1_000_000;

  return {
    pricingKnown: true,
    totalCostUsd,
  };
}

function recordOpenAiUsage({
  apiKey,
  model,
  requestType,
  usage,
  createdAt = new Date().toISOString(),
}) {
  const db = getOpenAiStoreDb();
  const fingerprint = createKeyFingerprint(apiKey);
  const key = getOpenAiKeyByFingerprint(fingerprint);
  const tokenCounts = {
    inputTokens: normalizeTokenCount(usage?.promptTokens ?? usage?.inputTokens ?? usage?.input_tokens),
    cachedInputTokens: normalizeTokenCount(
      usage?.cachedInputTokens ??
        usage?.cached_input_tokens ??
        usage?.input_tokens_details?.cached_tokens
    ),
    outputTokens: normalizeTokenCount(usage?.outputTokens ?? usage?.output_tokens),
    totalTokens: normalizeTokenCount(usage?.totalTokens ?? usage?.total_tokens),
  };
  const costEstimate = estimateOpenAiUsageCost(model, tokenCounts);

  db.prepare(
    `INSERT INTO openai_usage_events
      (id, api_key_fingerprint, api_key_label, api_key_last4, model, request_type, input_tokens, cached_input_tokens, output_tokens, total_tokens, estimated_cost_usd, pricing_known, created_at)
     VALUES
      (@id, @api_key_fingerprint, @api_key_label, @api_key_last4, @model, @request_type, @input_tokens, @cached_input_tokens, @output_tokens, @total_tokens, @estimated_cost_usd, @pricing_known, @created_at)`
  ).run({
    api_key_fingerprint: fingerprint,
    api_key_label: key?.label ?? normalizeKeyLabel(null, String(apiKey).slice(-4)),
    api_key_last4: key?.last4 ?? String(apiKey).slice(-4),
    cached_input_tokens: tokenCounts.cachedInputTokens,
    created_at: createdAt,
    estimated_cost_usd: costEstimate.totalCostUsd,
    id: crypto.randomUUID(),
    input_tokens: tokenCounts.inputTokens,
    model: String(model ?? "unknown"),
    pricing_known: costEstimate.pricingKnown ? 1 : 0,
    request_type: String(requestType ?? "openai_responses"),
    total_tokens: tokenCounts.totalTokens,
    output_tokens: tokenCounts.outputTokens,
  });

  return {
    apiKeyFingerprint: fingerprint,
    pricingKnown: costEstimate.pricingKnown,
    totalCostUsd: costEstimate.totalCostUsd,
  };
}

function resolveOpenAiRangeStart(rangePreset) {
  const normalized = String(rangePreset ?? "30d").trim().toLowerCase();
  const now = new Date();

  if (normalized === "all") {
    return null;
  }

  const days =
    normalized === "7d" ? 7 : normalized === "30d" ? 30 : normalized === "90d" ? 90 : 30;

  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildOpenAiUsageFilters({ apiKeyFingerprint, sinceIso }) {
  const clauses = [];
  const params = {};

  if (apiKeyFingerprint) {
    clauses.push("api_key_fingerprint = @apiKeyFingerprint");
    params.apiKeyFingerprint = apiKeyFingerprint;
  }

  if (sinceIso) {
    clauses.push("created_at >= @sinceIso");
    params.sinceIso = sinceIso;
  }

  return {
    clauses,
    params,
  };
}

function getOpenAiUsageDashboard({ apiKeyFingerprint = null, rangePreset = "30d" } = {}) {
  const db = getOpenAiStoreDb();
  const sinceIso = resolveOpenAiRangeStart(rangePreset);
  const filters = buildOpenAiUsageFilters({ apiKeyFingerprint, sinceIso });
  const whereClause = filters.clauses.length > 0 ? `WHERE ${filters.clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `
        SELECT
          api_key_fingerprint,
          api_key_label,
          api_key_last4,
          model,
          request_type,
          input_tokens,
          cached_input_tokens,
          output_tokens,
          total_tokens,
          estimated_cost_usd,
          pricing_known,
          created_at
        FROM openai_usage_events
        ${whereClause}
        ORDER BY created_at DESC
      `
    )
    .all(filters.params);

  const summary = {
    averageSpendUsd: 0,
    averageTokens: 0,
    pricingKnown: true,
    requestCount: 0,
    totalSpendUsd: 0,
    totalTokens: 0,
  };
  const byDay = new Map();
  const keyMap = new Map();

  rows.forEach((row) => {
    summary.requestCount += 1;
    summary.totalSpendUsd += Number(row.estimated_cost_usd ?? 0);
    summary.totalTokens += Number(row.total_tokens ?? 0);
    summary.pricingKnown = summary.pricingKnown && Boolean(row.pricing_known);

    const dayKey = new Date(row.created_at).toLocaleDateString("en-CA");
    const existingDay = byDay.get(dayKey) ?? {
      date: dayKey,
      requestCount: 0,
      totalSpendUsd: 0,
      totalTokens: 0,
    };
    existingDay.requestCount += 1;
    existingDay.totalSpendUsd += Number(row.estimated_cost_usd ?? 0);
    existingDay.totalTokens += Number(row.total_tokens ?? 0);
    byDay.set(dayKey, existingDay);

    const key = row.api_key_fingerprint;
    const existingKey = keyMap.get(key) ?? {
      active: false,
      apiKeyFingerprint: key,
      apiKeyLabel: row.api_key_label,
      apiKeyLast4: row.api_key_last4,
      requestCount: 0,
      totalSpendUsd: 0,
      totalTokens: 0,
    };
    existingKey.requestCount += 1;
    existingKey.totalSpendUsd += Number(row.estimated_cost_usd ?? 0);
    existingKey.totalTokens += Number(row.total_tokens ?? 0);
    keyMap.set(key, existingKey);
  });

  const keys = listOpenAiKeys();
  const enrichedKeys = keys.map((key) => {
    const keySummary = keyMap.get(key.fingerprint) ?? {
      requestCount: 0,
      totalSpendUsd: 0,
      totalTokens: 0,
    };

    return {
      ...key,
      requestCount: keySummary.requestCount,
      totalSpendUsd: keySummary.totalSpendUsd,
      totalTokens: keySummary.totalTokens,
    };
  });

  const activeKey = keys.find((key) => key.active) ?? null;
  const selectedKey =
    apiKeyFingerprint === null || apiKeyFingerprint === "all"
      ? null
      : apiKeyFingerprint === "active"
        ? activeKey
        : keys.find((key) => key.fingerprint === apiKeyFingerprint) ?? null;

  if (selectedKey) {
    const selectedSummary = keyMap.get(selectedKey.fingerprint);
    summary.requestCount = selectedSummary?.requestCount ?? 0;
    summary.totalSpendUsd = selectedSummary?.totalSpendUsd ?? 0;
    summary.totalTokens = selectedSummary?.totalTokens ?? 0;
  }

  summary.averageSpendUsd = summary.requestCount > 0 ? summary.totalSpendUsd / summary.requestCount : 0;
  summary.averageTokens = summary.requestCount > 0 ? summary.totalTokens / summary.requestCount : 0;

  return {
    activeKey,
    keys: enrichedKeys,
    pricingKnown: summary.pricingKnown,
    range: {
      preset: String(rangePreset ?? "30d"),
      sinceIso,
    },
    summary,
    timeline: [...byDay.values()]
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((day) => ({
        ...day,
        averageSpendUsd: day.requestCount > 0 ? day.totalSpendUsd / day.requestCount : 0,
      })),
  };
}

module.exports = {
  countOpenAiKeys,
  createKeyFingerprint,
  estimateOpenAiUsageCost,
  getActiveOpenAiKey,
  getOpenAiKeyByFingerprint,
  getOpenAiKeyRecordByFingerprint,
  getOpenAiStoreDb,
  getOpenAiUsageDashboard,
  hasOpenAiKeys,
  listOpenAiKeys,
  normalizeKeyLabel,
  recordOpenAiUsage,
  removeOpenAiKey,
  resolveOpenAiPricing,
  setActiveOpenAiKey,
  upsertOpenAiKey,
};
