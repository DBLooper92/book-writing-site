import { redirect } from "next/navigation";

import {
  buildTimelineCreateHref,
  buildTimelineCreateInitialValuesFromSearchParams,
  getTimelineCreateMode,
} from "@/lib/timeline/create-route";

type NewTimelineEventPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function NewTimelineEventPage({
  searchParams,
}: NewTimelineEventPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const initialValues = buildTimelineCreateInitialValuesFromSearchParams(
    resolvedSearchParams ?? {}
  );

  redirect(
    buildTimelineCreateHref({
      createMode: getTimelineCreateMode(resolvedSearchParams ?? {}),
      predecessorEventIds: initialValues.predecessorEventIds,
      successorEventIds: initialValues.successorEventIds,
      yearEnd: initialValues.yearEnd,
      yearStart: initialValues.yearStart,
    })
  );
}

