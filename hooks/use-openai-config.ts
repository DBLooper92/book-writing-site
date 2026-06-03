"use client";

import { useCallback, useEffect, useState } from "react";

export type OpenAiConfig = {
  configured: boolean;
  activeKeyId: string | null;
  defaultModel: string;
  keys: Array<{
    active: boolean;
    createdAt: string;
    fingerprint: string;
    label: string;
    last4: string;
    updatedAt: string;
  }>;
  last4: string | null;
  updatedAt: string | null;
};

export function useOpenAiConfig() {
  const [config, setConfig] = useState<OpenAiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await window.bookBible.ai.getConfig();
      setConfig(response.openai);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load AI settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = window.bookBible.ai.subscribeConfig(() => {
      void refresh();
    });

    return unsubscribe;
  }, [refresh]);

  return {
    config,
    error,
    loading,
    refresh,
  };
}
