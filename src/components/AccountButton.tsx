"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AccountButton() {
  const { configured, user, signIn, signUp, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Cloud sync not set up → don't show anything (app stays local-only).
  if (!configured) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[140px] truncate text-xs text-white/50 sm:inline" title={user.email ?? ""}>
          {user.email}
        </span>
        <button onClick={() => signOut()} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white">
          Sign out
        </button>
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    if (mode === "signup") {
      setNotice("Account created. Check your email if confirmation is required, then sign in.");
      setMode("signin");
      return;
    }
    setOpen(false);
    setEmail("");
    setPassword("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-white/80 hover:border-neon-cyan/40 hover:text-white"
      >
        Sign in
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="panel w-full max-w-sm space-y-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {mode === "signin" ? "Sign in" : "Create account"}
              </h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-white/45">
              Optional — sign in to sync your imported crate and saved sets across devices. The app
              works without an account too.
            </p>

            <div className="space-y-2">
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {error && <div className="text-xs text-neon-magenta">{error}</div>}
            {notice && <div className="text-xs text-neon-lime">{notice}</div>}

            <button onClick={submit} disabled={busy || !email || !password} className="btn-primary w-full">
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>

            <div className="text-center text-xs text-white/45">
              {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                  setNotice(null);
                }}
                className="text-neon-cyan hover:underline"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
