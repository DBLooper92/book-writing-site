const fs = require("fs");
const path = require("path");
const sqlite3 = require("better-sqlite3");
const { app, safeStorage } = require("electron");

const {
  buildMultiTimelineBrainDumpSystemPrompt,
  buildMultiTimelineBrainDumpUserPrompt,
  buildTimelineBrainDumpSystemPrompt,
  buildTimelineBrainDumpUserPrompt,
  extractFirstJsonObject,
  extractOpenAiResponseText,
} = require("../electron/ai-utils");

const PROJECT_DIR = path.resolve("C:/Users/veloc/Documents/BookWritingProjects/digital-prison");
const APP_DATA_DIR = path.resolve("C:/Users/veloc/AppData/Roaming/book-bible-desktop");
const OPENAI_STORE_PATH = path.join(APP_DATA_DIR, "openai-account.sqlite");
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";

function readTimelineEvents() {
  const db = new sqlite3(path.join(PROJECT_DIR, "data", "project.sqlite"));
  const rows = db.prepare('SELECT document_json FROM timeline_events').all();
  return rows
    .map((row) => JSON.parse(row.document_json))
    .sort((left, right) => {
      if (left.chronology_order !== right.chronology_order) {
        return (left.chronology_order ?? 0) - (right.chronology_order ?? 0);
      }
      return String(left.id).localeCompare(String(right.id));
    });
}

function buildInsertionContext(orderedEvents, insertionIndex, label, helperText) {
  const windowSize = 5;
  const beforeStart = Math.max(0, insertionIndex - windowSize);
  const beforeEvents = orderedEvents.slice(beforeStart, insertionIndex);
  const afterEvents = orderedEvents.slice(insertionIndex, insertionIndex + windowSize);
  const surroundingEvents = [
    ...beforeEvents.map((event, index) => ({
      chronologyLabel: formatEventLabel(event),
      id: event.id,
      position: beforeStart + index + 1,
      relation: "before",
      title: event.title,
    })),
    ...afterEvents.map((event, index) => ({
      chronologyLabel: formatEventLabel(event),
      id: event.id,
      position: insertionIndex + index + 1,
      relation: "after",
      title: event.title,
    })),
  ];

  return {
    helperText,
    label,
    surroundingEvents,
  };
}

function formatEventLabel(event) {
  const bits = [event.year_start, event.month_start, event.day_start]
    .filter((value) => value !== null && value !== undefined && String(value).length > 0)
    .map((value) => String(value).padStart(2, "0"));
  return bits.join("-") || String(event.display_date_label || event.year_start || event.id);
}

function loadBrainDump(relativePath) {
  return fs.readFileSync(path.join(PROJECT_DIR, relativePath), "utf8");
}

async function decryptOpenAiKey() {
  const db = new sqlite3(OPENAI_STORE_PATH);
  const row = db
    .prepare(
      `SELECT encrypted_key
       FROM openai_keys
       WHERE is_active = 1
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .get();

  if (!row?.encrypted_key) {
    throw new Error("No active OpenAI key found.");
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Electron safeStorage is unavailable in this runtime.");
  }

  return safeStorage.decryptString(Buffer.from(row.encrypted_key, "base64"));
}

async function callOpenAiResponsesApi({ apiKey, instructions, input, model = DEFAULT_MODEL, maxOutputTokens = 1200 }) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      instructions,
      max_output_tokens: maxOutputTokens,
      model,
    }),
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
    const message = payload?.error?.message || `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function summarizeSingleResult(label, rawText) {
  const parsed = extractFirstJsonObject(rawText);
  const event = parsed?.event ?? {};
  const entityCount = Array.isArray(parsed?.entities) ? parsed.entities.length : 0;
  return {
    label,
    eventType: event.eventType ?? null,
    title: event.title ?? null,
    yearStart: event.yearStart ?? null,
    entityCount,
    warnings: [],
    parsed,
    rawText,
  };
}

function summarizeMultiResult(label, rawText) {
  const parsed = extractFirstJsonObject(rawText);
  const events = Array.isArray(parsed?.events) ? parsed.events : [];
  const warnings = Array.isArray(parsed?.warnings) ? parsed.warnings : [];
  return {
    label,
    eventCount: events.length,
    titles: events.map((entry) => entry?.prefill?.title ?? entry?.event?.title ?? ""),
    warnings,
    parsed,
    rawText,
  };
}

async function runSingle(apiKey, brainDumpText, projectContext, label) {
  const payload = await callOpenAiResponsesApi({
    apiKey,
    instructions: buildTimelineBrainDumpSystemPrompt(),
    input: buildTimelineBrainDumpUserPrompt({
      brainDumpText,
      projectContext,
    }),
    maxOutputTokens: 1600,
  });

  const rawText = extractOpenAiResponseText(payload);
  return summarizeSingleResult(label, rawText);
}

async function runMulti(apiKey, brainDumpText, projectContext, label) {
  const payload = await callOpenAiResponsesApi({
    apiKey,
    instructions: buildMultiTimelineBrainDumpSystemPrompt(),
    input: buildMultiTimelineBrainDumpUserPrompt({
      brainDumpText,
      chunkIndex: 1,
      chunkTotal: 1,
      projectContext,
      chunkText: brainDumpText,
    }),
    maxOutputTokens: 1800,
  });

  const rawText = extractOpenAiResponseText(payload);
  return summarizeMultiResult(label, rawText);
}

async function main() {
  await app.whenReady();

  const apiKey = await decryptOpenAiKey();
  const timelineEvents = readTimelineEvents();

  const cases = [
    {
      label: "single-2415-to-2416",
      mode: "single",
      file: "inbox/brain-dumps/single-2415-to-2416.md",
      insertionIndex: 6,
    },
    {
      label: "single-2420-to-2435",
      mode: "single",
      file: "inbox/brain-dumps/single-2420-to-2435.md",
      insertionIndex: 8,
    },
    {
      label: "multi-2415-to-2416",
      mode: "multi",
      file: "inbox/brain-dumps/multi-2415-to-2416.md",
      insertionIndex: 6,
    },
    {
      label: "multi-2420-to-2435",
      mode: "multi",
      file: "inbox/brain-dumps/multi-2420-to-2435.md",
      insertionIndex: 8,
    },
  ];

  const results = [];

  for (const testCase of cases) {
    console.log(`Running ${testCase.label}...`);
    const insertionContext = buildInsertionContext(
      timelineEvents,
      testCase.insertionIndex,
      "Digital Prison gap",
      "Keep the extracted draft(s) between the before and after anchors."
    );
    const projectContext = {
      insertionContext,
      predecessorEventIds: timelineEvents[testCase.insertionIndex - 1]
        ? [timelineEvents[testCase.insertionIndex - 1].id]
        : [],
      successorEventIds: timelineEvents[testCase.insertionIndex]
        ? [timelineEvents[testCase.insertionIndex].id]
        : [],
      yearStart: String(timelineEvents[testCase.insertionIndex - 1]?.year_start ?? ""),
      yearEnd: String(timelineEvents[testCase.insertionIndex]?.year_start ?? ""),
    };
    const brainDumpText = loadBrainDump(testCase.file);

    if (testCase.mode === "single") {
      results.push(await runSingle(apiKey, brainDumpText, projectContext, testCase.label));
    } else {
      results.push(await runMulti(apiKey, brainDumpText, projectContext, testCase.label));
    }
  }

  console.log(JSON.stringify(results, null, 2));
  app.quit();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  app.quit();
});
