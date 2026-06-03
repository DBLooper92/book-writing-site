"use client";

import { useCallback, useEffect, useState } from "react";

import type { OpenAiConfig } from "@/hooks/use-openai-config";

export type OpenAiUsageRangePreset = "7d" | "30d" | "90d" | "all";

export type OpenAiUsageScope = "all" | "active" | string;

export type OpenAiUsageDashboard = {
  activeKey: {
    active: boolean;
    createdAt: string;
    fingerprint: string;
    label: string;
    last4: string;
    updatedAt: string;
  } | null;
  keys: Array<{
    active: boolean;
    apiKeyFingerprint: string;
    apiKeyLabel: string;
    apiKeyLast4: string;
    createdAt: string;
    requestCount: number;
    totalSpendUsd: number;
    totalTokens: number;
  }>;
  pricingKnown: boolean;
  range: {
    preset: string;
    sinceIso: string | null;
  };
  summary: {
    averageSpendUsd: number;
    averageTokens: number;
    pricingKnown: boolean;
    requestCount: number;
    totalSpendUsd: number;
    totalTokens: number;
  };
  timeline: Array<{
    averageSpendUsd: number;
    date: string;
    requestCount: number;
    totalSpendUsd: number;
    totalTokens: number;
  }>;
};

export type OpenAiDashboardState = {
  config: OpenAiConfig | null;
  dashboard: OpenAiUsageDashboard | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useOpenAiDashboard(
  rangePreset: OpenAiUsageRangePreset,
  scope: OpenAiUsageScope = "all"
): OpenAiDashboardState {
  const [config, setConfig] = useState<OpenAiConfig | null>(null);
  const [dashboard, setDashboard] = useState<OpenAiUsageDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await window.bookBible.ai.getDashboard({
        rangePreset,
        scope,
      });

      setConfig(response.openai);
      setDashboard(response.usage);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load OpenAI usage.");
    } finally {
      setLoading(false);
    }
  }, [rangePreset, scope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => window.bookBible.ai.subscribeUsage(() => {
    void refresh();
  }), [refresh]);

  useEffect(() => window.bookBible.ai.subscribeConfig(() => {
    void refresh();
  }), [refresh]);

  return {
    config,
    dashboard,
    error,
    loading,
    refresh,
  };
}
