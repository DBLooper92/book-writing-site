"use client";

import { useCallback, useEffect, useState } from "react";

import type { BookBibleAppSettings } from "@/types/electron-api";

function normalizeAppSettings(settings: Partial<BookBibleAppSettings> | null | undefined): BookBibleAppSettings {
  const profile: Partial<BookBibleAppSettings["profile"]> = settings?.profile ?? {};

  return {
    autoCorrectTyping: Boolean(settings?.autoCorrectTyping),
    profile: {
      defaultPenName:
        typeof profile.defaultPenName === "string" && profile.defaultPenName.trim()
          ? profile.defaultPenName.trim()
          : null,
      firstName: typeof profile.firstName === "string" && profile.firstName.trim() ? profile.firstName.trim() : null,
      lastName: typeof profile.lastName === "string" && profile.lastName.trim() ? profile.lastName.trim() : null,
      penNames: Array.isArray(profile.penNames)
        ? profile.penNames
            .map((value) => (typeof value === "string" ? value.trim() : ""))
            .filter((value): value is string => Boolean(value))
        : [],
    },
  };
}

export function useAppSettings() {
  const [settings, setSettings] = useState<BookBibleAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await window.bookBible.app.getSettings();
      setSettings(normalizeAppSettings(response));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load app settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  const setAutoCorrectTyping = useCallback(async (enabled: boolean) => {
    setError(null);

    try {
      const response = await window.bookBible.app.setAutoCorrectTyping(enabled);
      const normalizedResponse = normalizeAppSettings(response);
      setSettings(normalizedResponse);
      return normalizedResponse;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update app settings.");
      throw nextError;
    }
  }, []);

  const updateProfileInfo = useCallback(async (input: { firstName: string; lastName: string }) => {
    setError(null);

    try {
      const response = await window.bookBible.app.updateProfileInfo(input);
      const normalizedResponse = normalizeAppSettings(response);
      setSettings(normalizedResponse);
      return normalizedResponse;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update profile info.");
      throw nextError;
    }
  }, []);

  const addPenName = useCallback(async (penName: string) => {
    setError(null);

    try {
      const response = await window.bookBible.app.addPenName(penName);
      const normalizedResponse = normalizeAppSettings(response);
      setSettings(normalizedResponse);
      return normalizedResponse;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to add pen name.");
      throw nextError;
    }
  }, []);

  const setDefaultPenName = useCallback(async (penName: string) => {
    setError(null);

    try {
      const response = await window.bookBible.app.setDefaultPenName(penName);
      const normalizedResponse = normalizeAppSettings(response);
      setSettings(normalizedResponse);
      return normalizedResponse;
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to update default pen name."
      );
      throw nextError;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = window.bookBible.app.subscribeSettings(() => {
      void refresh();
    });

    return unsubscribe;
  }, [refresh]);

  return {
    error,
    loading,
    refresh,
    setAutoCorrectTyping,
    addPenName,
    setDefaultPenName,
    updateProfileInfo,
    settings,
  };
}
