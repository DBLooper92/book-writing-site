"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  DEFAULT_AI_CAPABILITY_SETTINGS,
  type AiCapabilitySettings,
} from "@/lib/ai/capabilities";
import { useAuthUser } from "@/hooks/use-auth-user";

type AiCapabilitiesContextValue = {
  error: string | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  replaceSettings: (settings: AiCapabilitySettings) => void;
  settings: AiCapabilitySettings;
};

const AiCapabilitiesContext = createContext<AiCapabilitiesContextValue | null>(null);

export function AiCapabilitiesProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuthUser();
  const [settings, setSettings] = useState<AiCapabilitySettings>(
    DEFAULT_AI_CAPABILITY_SETTINGS
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings(nextUid: string | null) {
    if (!nextUid) {
      setSettings(DEFAULT_AI_CAPABILITY_SETTINGS);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/profile/ai-capabilities", {
        method: "GET",
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            creativeEnabled?: boolean;
            organizationalEnabled?: boolean;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load AI access settings.");
      }

      setSettings({
        creativeEnabled: payload?.creativeEnabled ?? true,
        organizationalEnabled: payload?.organizationalEnabled ?? true,
      });
      setError(null);
    } catch (nextError) {
      setSettings(DEFAULT_AI_CAPABILITY_SETTINGS);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load AI access settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings(uid);
  }, [uid]);

  return (
    <AiCapabilitiesContext.Provider
      value={{
        error,
        loading,
        refreshSettings: async () => {
          await loadSettings(uid);
        },
        replaceSettings: setSettings,
        settings,
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
