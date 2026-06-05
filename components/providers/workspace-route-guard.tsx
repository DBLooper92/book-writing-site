"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useActiveProject } from "@/hooks/use-active-project";

export function WorkspaceRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeProjectId, loading } = useActiveProject();
  const isLauncherRoute = pathname === "/";
  const [allowRedirect, setAllowRedirect] = useState(false);

  useEffect(() => {
    setAllowRedirect(true);
  }, []);

  useEffect(() => {
    if (!allowRedirect || isLauncherRoute || loading || activeProjectId) {
      return;
    }

      router.replace("/");
  }, [activeProjectId, allowRedirect, isLauncherRoute, loading, router]);

  if (!isLauncherRoute && allowRedirect && !loading && !activeProjectId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-700">
        Redirecting to launcher...
      </main>
    );
  }

  return <>{children}</>;
}
