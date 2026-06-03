"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useActiveProject } from "@/hooks/use-active-project";

export function WorkspaceRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeProjectId, loading } = useActiveProject();
  const isLauncherRoute = pathname === "/";

  useEffect(() => {
    if (!isLauncherRoute && !loading && !activeProjectId) {
      router.replace("/");
    }
  }, [activeProjectId, isLauncherRoute, loading, router]);

  useEffect(() => {
    if (isLauncherRoute || !loading) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace("/");
    }, 4000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isLauncherRoute, loading, router]);

  if (!isLauncherRoute && loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-700">
        Loading local project workspace...
      </main>
    );
  }

  if (!isLauncherRoute && !activeProjectId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-700">
        Redirecting to launcher...
      </main>
    );
  }

  return <>{children}</>;
}
