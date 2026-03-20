import type { ReactNode } from "react";

type RetconDetailSectionProps = {
  title: string;
  children: ReactNode;
};

export function RetconDetailSection({ title, children }: RetconDetailSectionProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
