import { AiSessionDetailSection } from "@/components/ai-sessions/ai-session-detail-section";
import type { AiSession } from "@/types/ai-session";

type AiSessionBrainDumpDetailProps = {
  aiSession: AiSession;
};

export function AiSessionBrainDumpDetail({ aiSession }: AiSessionBrainDumpDetailProps) {
  const extractionResult = aiSession.extractionResult;

  return (
    <>
      <AiSessionDetailSection title="Brain dump source">
        <div className="space-y-4">
          <TextPanel label="AI guidance" value={aiSession.sourceGuidance} fallback="No additional guidance." />
          <TextPanel label="Source text" value={aiSession.sourceText} fallback="No source text saved." />
        </div>
      </AiSessionDetailSection>

      <AiSessionDetailSection title="Extraction status">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Extraction status" value={formatEnumLabel(aiSession.extractionStatus)} />
          <DetailItem label="Extraction model" value={aiSession.extractionModel || aiSession.model || "None"} />
          <DetailItem label="Provider" value={aiSession.provider || "None"} />
          <DetailItem label="Messages count" value={String(aiSession.messagesCount ?? "Unknown")} />
        </div>
        {aiSession.extractionError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {aiSession.extractionError}
          </div>
        ) : null}
      </AiSessionDetailSection>

      {extractionResult ? (
        <>
          <AiSessionDetailSection title="Extraction overview">
            <div className="space-y-4">
              <TextPanel
                label="Summary"
                value={extractionResult.summary || aiSession.summary}
                fallback="No extraction summary."
              />
              <ListPanel
                label="Continuity warnings"
                values={extractionResult.continuityWarnings}
                fallback="No continuity warnings."
              />
              <ListPanel
                label="Unresolved questions"
                values={extractionResult.unresolvedQuestions}
                fallback="No unresolved questions."
              />
              <ListPanel
                label="Suggested next actions"
                values={extractionResult.suggestedNextActions}
                fallback="No suggested next actions."
              />
            </div>
          </AiSessionDetailSection>

          <ProposalSection
            title="Character proposals"
            emptyMessage="No character proposals were extracted."
            items={extractionResult.characters.map((proposal) => ({
              title: proposal.name,
              fields: [
                { label: "Summary", value: proposal.summary },
                {
                  label: "Type",
                  value: compactList([proposal.characterType, proposal.importanceLevel]),
                },
                { label: "Traits", value: compactList(proposal.traits) },
                { label: "Motivations", value: compactList(proposal.motivations) },
                { label: "Related scenes", value: compactList(proposal.relatedSceneTitles) },
                { label: "Evidence", value: proposal.evidence },
                { label: "Confidence", value: formatEnumLabel(proposal.confidence) },
              ],
            }))}
          />

          <ProposalSection
            title="Timeline event proposals"
            emptyMessage="No timeline event proposals were extracted."
            items={extractionResult.timelineEvents.map((proposal) => ({
              title: proposal.title,
              fields: [
                { label: "Summary", value: proposal.summary },
                {
                  label: "Placement",
                  value: compactList([formatEnumLabel(proposal.eventType), proposal.dateLabel]),
                },
                { label: "Characters", value: compactList(proposal.linkedCharacterNames) },
                { label: "Locations", value: compactList(proposal.linkedLocationNames) },
                { label: "Chapters", value: compactList(proposal.linkedChapterTitles) },
                { label: "Scenes", value: compactList(proposal.linkedSceneTitles) },
                { label: "Evidence", value: proposal.evidence },
                { label: "Confidence", value: formatEnumLabel(proposal.confidence) },
              ],
            }))}
          />

          <ProposalSection
            title="Chapter outline proposals"
            emptyMessage="No chapter outline proposals were extracted."
            items={extractionResult.chapterOutlines.map((proposal) => ({
              title: proposal.title,
              fields: [
                { label: "Summary", value: proposal.summary },
                { label: "Purpose", value: proposal.purpose },
                { label: "POV", value: proposal.pointOfViewCharacterName },
                { label: "Estimated chapter number", value: proposal.estimatedChapterNumber },
                { label: "Scene titles", value: compactList(proposal.sceneTitles) },
                { label: "Evidence", value: proposal.evidence },
                { label: "Confidence", value: formatEnumLabel(proposal.confidence) },
              ],
            }))}
          />

          <ProposalSection
            title="Scene proposals"
            emptyMessage="No scene proposals were extracted."
            items={extractionResult.scenes.map((proposal) => ({
              title: proposal.title,
              fields: [
                { label: "Summary", value: proposal.summary },
                {
                  label: "Type and POV",
                  value: compactList([
                    formatEnumLabel(proposal.sceneType),
                    proposal.pointOfViewCharacterName,
                  ]),
                },
                { label: "Goal", value: proposal.goal },
                { label: "Conflict", value: proposal.conflict },
                { label: "Outcome", value: proposal.outcome },
                {
                  label: "Linked timeline events",
                  value: compactList(proposal.linkedTimelineEventTitles),
                },
                { label: "Evidence", value: proposal.evidence },
                { label: "Confidence", value: formatEnumLabel(proposal.confidence) },
              ],
            }))}
          />
        </>
      ) : null}
    </>
  );
}

function ProposalSection({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: Array<{
    title: string;
    fields: Array<{ label: string; value: string }>;
  }>;
  emptyMessage: string;
}) {
  return (
    <AiSessionDetailSection title={title}>
      {items.length > 0 ? (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <article
              key={`${title}-${item.title}-${index}`}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <h3 className="text-base font-semibold tracking-tight text-zinc-950">{item.title}</h3>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {item.fields.map((field) => (
                  <div key={`${item.title}-${field.label}`}>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                      {field.label}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {field.value || "None"}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      )}
    </AiSessionDetailSection>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 wrap-break-word text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function TextPanel({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string;
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
        {value || fallback}
      </p>
    </div>
  );
}

function ListPanel({
  label,
  values,
  fallback,
}: {
  label: string;
  values: string[];
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      {values.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
          {values.map((value, index) => (
            <li key={`${label}-${index}`}>{value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">{fallback}</p>
      )}
    </div>
  );
}

function compactList(values: string[]) {
  return values.filter(Boolean).join(", ");
}

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}
