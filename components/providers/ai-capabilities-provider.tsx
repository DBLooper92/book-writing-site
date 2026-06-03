"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  DEFAULT_AI_CAPABILITY_SETTINGS,
  type AiCapabilitySettings,
} from "@/lib/ai/capabilities";

type AiCapabilitiesContextValue = {
  error: string | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  replaceSettings: (_settings: AiCapabilitySettings) => void;
  settings: AiCapabilitySettings;
};

const AiCapabilitiesContext = createContext<AiCapabilitiesContextValue | null>(null);

export function AiCapabilitiesProvider({ children }: { children: ReactNode }) {
  return (
    <AiCapabilitiesContext.Provider
      value={{
        error: null,
        loading: false,
        refreshSettings: async () => {},
        replaceSettings: () => {},
        settings: DEFAULT_AI_CAPABILITY_SETTINGS,
      }}
    >
      {children}
    </AiCapabilitiesContext.Provider>
  );
}

export function useAiCapabilities() {
  const context = useContext(AiCapabilitiesContext);

  if (!context) {
    throw new Error("useAiCapabilities must be used inside AiCapabilitiesProvider.");
  }

  return context;
}
