import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { ProjectSwitcherOverlay } from "@/components/providers/project-switcher-overlay";
import { AiCapabilitiesProvider } from "@/components/providers/ai-capabilities-provider";
import { AutoCorrectTypingBootstrap } from "@/components/providers/auto-correct-typing-bootstrap";
import { WorkspaceRouteGuard } from "@/components/providers/workspace-route-guard";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuildaBook",
  description: "Local-first desktop writing workspace with reviewable Codex proposal drafts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AiCapabilitiesProvider>
          <AutoCorrectTypingBootstrap />
          <Script id="book-bible-bootstrap" strategy="beforeInteractive">
            {`
              try {
                var currentProject = window.bookBible?.project?.getCurrentSync ? window.bookBible.project.getCurrentSync() : null;
                var recentProjects = window.bookBible?.launcher?.listRecentProjectsSync ? window.bookBible.launcher.listRecentProjectsSync() : [];
                window.__bookBibleBootstrap = {
                  currentProject: currentProject,
                  recentProjects: Array.isArray(recentProjects) ? recentProjects : [],
                };
              } catch (error) {
                window.__bookBibleBootstrap = {
                  currentProject: null,
                  recentProjects: [],
                  error: error instanceof Error ? error.message : String(error),
                };
              }
            `}
          </Script>
          <WorkspaceRouteGuard>
            <div className="min-h-screen bg-zinc-50 text-zinc-950">
              <Suspense fallback={null}>
                <ProjectSwitcherOverlay />
              </Suspense>
              {children}
            </div>
          </WorkspaceRouteGuard>
        </AiCapabilitiesProvider>
      </body>
    </html>
  );
}
