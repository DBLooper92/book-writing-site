"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  getActiveSliceNavigationConfig,
  SliceSidebar,
} from "@/components/navigation/slice-sidebar";

type SlicePageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function SlicePageLayout({
  eyebrow,
  title,
  description,
  children,
}: SlicePageLayoutProps) {
  const pathname = usePathname();
  const activeSlice = getActiveSliceNavigationConfig(pathname);

  if (!activeSlice) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <PageShellHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
        {children}
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-6rem)] w-full flex-col xl:min-h-[calc(100vh-6rem)]">
      <section className="grid flex-1 xl:grid-cols-[22rem_minmax(0,1fr)] xl:overflow-hidden">
        <SliceSidebar pathname={pathname} />

        <section className="min-h-0 bg-[linear-gradient(180deg,#fcfcfb_0%,#f8f8f6_100%)] xl:overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-6 xl:p-8">
            <PageShellHeader
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
            {children}
          </div>
        </section>
      </section>
    </main>
  );
}

function PageShellHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
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
  );
}
