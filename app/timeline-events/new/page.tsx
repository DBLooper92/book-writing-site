import {
  createEmptyTimelineEventFormValues,
  type TimelineEventFormValues,
} from "@/types/timeline-event";

import { NewTimelineEventPageClient } from "@/components/timeline-events/new-timeline-event-page-client";

type NewTimelineEventPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function NewTimelineEventPage({
  searchParams,
}: NewTimelineEventPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const initialValues = buildInitialValuesFromSearchParams(resolvedSearchParams ?? {});

  return <NewTimelineEventPageClient initialValues={initialValues} />;
}

function buildInitialValuesFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): TimelineEventFormValues {
  const initialValues = createEmptyTimelineEventFormValues();

  initialValues.yearStart = readQueryValue(searchParams, "yearStart");
  initialValues.yearEnd = readQueryValue(searchParams, "yearEnd");
  initialValues.predecessorEventIds = readQueryValues(searchParams, "predecessorEventIds");
  initialValues.successorEventIds = readQueryValues(searchParams, "successorEventIds");

  return initialValues;
}

function readQueryValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return "";
}

function readQueryValues(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  const normalized = Array.isArray(value) ? value.join(",") : value ?? "";

  return Array.from(
    new Set(
      normalized
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}
