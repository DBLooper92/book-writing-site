import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TopNav } from "@/components/navigation/top-nav";
import { AiCapabilitiesProvider } from "@/components/providers/ai-capabilities-provider";
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
  title: "Book Bible Desktop",
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
          <WorkspaceRouteGuard>
            <div className="min-h-screen bg-zinc-50 text-zinc-950">
              <TopNav />
              <div className="pt-24">{children}</div>
            </div>
          </WorkspaceRouteGuard>
        </AiCapabilitiesProvider>
      </body>
    </html>
  );
}
