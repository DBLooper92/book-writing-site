"use client";

import { useEffect, useState } from "react";

import { observeAuthState } from "@/lib/auth";
import type { AppAuthUser } from "@/types/auth";

type UseAuthUserResult = {
  user: AppAuthUser | null;
  uid: string | null;
  loading: boolean;
};

export function useAuthUser(): UseAuthUserResult {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return observeAuthState((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  return {
    user,
    uid: user?.uid ?? null,
    loading,
  };
}
