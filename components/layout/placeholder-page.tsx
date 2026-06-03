import { PageShell } from "@/components/layout/page-shell";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  placeholderTitle: string;
  placeholderDescription: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  placeholderTitle,
  placeholderDescription,
}: PlaceholderPageProps) {
  return (
    <PageShell eyebrow={eyebrow} title={title} description={description}>
      <section className="rounded-3xl border border-dashed border-zinc-300 bg-white/80 p-6">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
          {placeholderTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          {placeholderDescription}
        </p>
      </section>
    </PageShell>
  );
}
