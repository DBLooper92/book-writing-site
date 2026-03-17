"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { observeAuthState } from "@/lib/firebase/auth";

type UseAuthUserResult = {
  user: User | null;
  uid: string | null;
  loading: boolean;
};

export function useAuthUser(): UseAuthUserResult {
  const [user, setUser] = useState<User | null>(null);
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
