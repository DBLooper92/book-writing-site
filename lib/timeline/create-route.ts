import {
  createEmptyTimelineEventFormValues,
  type TimelineEventFormValues,
} from "@/types/timeline-event";

export const TIMELINE_CREATE_QUERY_KEY = "compose";
export const TIMELINE_CREATE_QUERY_VALUE = "new";

const TIMELINE_CREATE_PREFILL_KEYS = [
  "yearStart",
  "yearEnd",
  "predecessorEventIds",
  "successorEventIds",
] as const;

type TimelineCreateSearchParams =
  | Record<string, string | string[] | undefined>
  | {
      get(name: string): string | null;
      getAll(name: string): string[];
    };

type TimelineCreatePrefill = {
  predecessorEventIds?: string[];
  successorEventIds?: string[];
  yearEnd?: string;
  yearStart?: string;
};

export function buildTimelineCreateHref(prefill: TimelineCreatePrefill = {}) {
  const params = new URLSearchParams();
  params.set(TIMELINE_CREATE_QUERY_KEY, TIMELINE_CREATE_QUERY_VALUE);

  if (prefill.yearStart?.trim()) {
    params.set("yearStart", prefill.yearStart.trim());
  }

  if (prefill.yearEnd?.trim()) {
    params.set("yearEnd", prefill.yearEnd.trim());
  }

  const predecessorEventIds = normalizeQueryValues(prefill.predecessorEventIds ?? []);
  if (predecessorEventIds.length > 0) {
    params.set("predecessorEventIds", predecessorEventIds.join(","));
  }

  const successorEventIds = normalizeQueryValues(prefill.successorEventIds ?? []);
  if (successorEventIds.length > 0) {
    params.set("successorEventIds", successorEventIds.join(","));
  }

  return `/timeline?${params.toString()}`;
}

export function buildTimelineCreateInitialValuesFromSearchParams(
  searchParams: TimelineCreateSearchParams
): TimelineEventFormValues {
  const initialValues = createEmptyTimelineEventFormValues();

  initialValues.yearStart = readQueryValue(searchParams, "yearStart");
  initialValues.yearEnd = readQueryValue(searchParams, "yearEnd");
  initialValues.predecessorEventIds = readQueryValues(searchParams, "predecessorEventIds");
  initialValues.successorEventIds = readQueryValues(searchParams, "successorEventIds");

  return initialValues;
}

export function hasTimelineCreateSearchParams(searchParams: TimelineCreateSearchParams) {
  return readQueryValue(searchParams, TIMELINE_CREATE_QUERY_KEY) === TIMELINE_CREATE_QUERY_VALUE;
}

export function clearTimelineCreateSearchParams(searchParams: URLSearchParams) {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  nextSearchParams.delete(TIMELINE_CREATE_QUERY_KEY);

  TIMELINE_CREATE_PREFILL_KEYS.forEach((key) => {
    nextSearchParams.delete(key);
  });

  return nextSearchParams;
}

function readQueryValue(searchParams: TimelineCreateSearchParams, key: string) {
  if (hasSearchParamMethods(searchParams)) {
    return searchParams.get(key)?.trim() ?? "";
  }

  const value = searchParams[key];

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return "";
}

function readQueryValues(searchParams: TimelineCreateSearchParams, key: string) {
  if (hasSearchParamMethods(searchParams)) {
    const values = searchParams.getAll(key);

    if (values.length > 0) {
      return normalizeQueryValues(values.flatMap((value) => value.split(",")));
    }

    const singleValue = searchParams.get(key);
    return normalizeQueryValues(singleValue ? singleValue.split(",") : []);
  }

  const value = searchParams[key];
  const normalized = Array.isArray(value) ? value.join(",") : value ?? "";

  return normalizeQueryValues(normalized.split(","));
}

function normalizeQueryValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function hasSearchParamMethods(
  value: TimelineCreateSearchParams
): value is Extract<TimelineCreateSearchParams, { get(name: string): string | null }> {
  return typeof value === "object" && value !== null && "get" in value;
}
