import type { ReactNode } from "react";

import { SlicePageLayout } from "@/components/layout/slice-page-layout";

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
    <SlicePageLayout eyebrow={eyebrow} title={title} description={description}>
      {children}
    </SlicePageLayout>
  );
}
