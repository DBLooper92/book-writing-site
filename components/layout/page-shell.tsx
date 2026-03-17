import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
          {description}
        </p>
      </section>
      {children}
    </main>
  );
}
