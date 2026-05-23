"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

interface AuthValue {
  /** Supabase client, or null when cloud sync isn't configured. */
  client: SupabaseClient | null;
  /** Whether cloud sync is configured in this environment. */
  configured: boolean;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  /** Sends a password-reset email. The link lands on /reset-password. */
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  /** Updates the current user's password (used on /reset-password after click-through). */
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  /** Deletes the user's data + auth account via the server route. */
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getSupabase(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!client) return { error: "Cloud sync is not configured." };
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        },
      });
      if (error) return { error: error.message };
      // Supabase returns no active session when email confirmation is required.
      return { needsConfirmation: !data.session };
    },
    [client],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!client) return { error: "Cloud sync is not configured." };
      const { error } = await client.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (client) await client.auth.signOut();
  }, [client]);

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!client) return { error: "Cloud sync is not configured." };
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
      });
      return error ? { error: error.message } : {};
    },
    [client],
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      if (!client) return { error: "Cloud sync is not configured." };
      const { error } = await client.auth.updateUser({ password: newPassword });
      return error ? { error: error.message } : {};
    },
    [client],
  );

  const deleteAccount = useCallback(async () => {
    if (!client) return { error: "Cloud sync is not configured." };
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session) return { error: "Not signed in." };

    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: "Delete failed." }));
      return { error: body.message ?? "Delete failed." };
    }
    // Server confirmed deletion; tear down the local session.
    await client.auth.signOut();
    return {};
  }, [client]);

  const value: AuthValue = useMemo(
    () => ({
      client,
      configured: Boolean(client),
      user,
      loading,
      signUp,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
      deleteAccount,
    }),
    [client, user, loading, signUp, signIn, signOut, requestPasswordReset, updatePassword, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
