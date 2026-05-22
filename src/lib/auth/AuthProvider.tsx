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
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
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
      const { error } = await client.auth.signUp({ email, password });
      return error ? { error: error.message } : {};
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

  const value: AuthValue = useMemo(
    () => ({ client, configured: Boolean(client), user, loading, signUp, signIn, signOut }),
    [client, user, loading, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
