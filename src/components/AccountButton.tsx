"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "./Toast";

type Mode = "signin" | "signup" | "forgot";

export function AccountButton() {
  const { configured, user, signIn, signUp, signOut, requestPasswordReset, deleteAccount } = useAuth();
  const toast = useToast();

  // Auth modal (signed-out)
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Account modal (signed-in)
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!configured) return null;

  // ── signed-in render ────────────────────────────────────────────────────
  if (user) {
    async function doSignOut() {
      await signOut();
      toast.info("Signed out.");
      setAccountOpen(false);
    }

    async function doDelete() {
      setDeleting(true);
      const { error } = await deleteAccount();
      setDeleting(false);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Account deleted.");
      setAccountOpen(false);
      setConfirmText("");
    }

    return (
      <>
        <button
          onClick={() => setAccountOpen(true)}
          className="hidden max-w-[180px] truncate rounded-lg px-3 py-1.5 text-xs text-white/55 hover:bg-white/5 hover:text-white sm:inline-block"
          title={user.email ?? ""}
        >
          {user.email}
        </button>

        {accountOpen && (
          <Modal onClose={() => setAccountOpen(false)} title="Account">
            <div className="space-y-4">
              <div>
                <div className="label-cap">Signed in as</div>
                <div className="mt-1 truncate text-sm text-white/85">{user.email}</div>
              </div>

              <button onClick={doSignOut} className="btn-ghost w-full">Sign out</button>

              <div className="rounded-xl border border-neon-magenta/25 bg-neon-magenta/5 p-4">
                <div className="label-cap text-neon-magenta/80">Danger zone</div>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  Delete your account and all synced data (imported tracks + saved sets). This
                  cannot be undone.
                </p>
                <input
                  className="input mt-3"
                  placeholder='Type "DELETE" to enable'
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
                <button
                  onClick={doDelete}
                  disabled={confirmText !== "DELETE" || deleting}
                  className="btn mt-2 w-full bg-neon-magenta/80 text-ink-900 hover:bg-neon-magenta disabled:opacity-30"
                >
                  {deleting ? "Deleting…" : "Permanently delete account"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }

  // ── signed-out render ───────────────────────────────────────────────────
  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "forgot") {
        const { error } = await requestPasswordReset(email.trim());
        if (error) { setError(error); return; }
        setNotice("If that email is registered, a reset link is on its way.");
        return;
      }
      if (mode === "signup") {
        const result = await signUp(email.trim(), password);
        if (result.error) { setError(result.error); return; }
        if (result.needsConfirmation) {
          setNotice("Account created. Check your inbox to confirm the email, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const result = await signIn(email.trim(), password);
        if (result.error) { setError(result.error); return; }
      }
      // Signed in successfully.
      setAuthOpen(false);
      setEmail("");
      setPassword("");
      toast.success("Signed in.");
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password";

  return (
    <>
      <button
        onClick={() => { setAuthOpen(true); setMode("signin"); }}
        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-white/80 hover:border-neon-cyan/40 hover:text-white"
      >
        Sign in
      </button>

      {authOpen && (
        <Modal onClose={() => setAuthOpen(false)} title={heading}>
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
            {mode !== "forgot" && (
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            )}
          </div>

          {error && <div className="text-xs text-neon-magenta">{error}</div>}
          {notice && <div className="text-xs text-neon-lime">{notice}</div>}

          <button
            onClick={submit}
            disabled={busy || !email || (mode !== "forgot" && !password)}
            className="btn-primary w-full"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>

          <div className="space-y-1 text-center text-xs text-white/45">
            {mode === "signin" && (
              <>
                <div>
                  No account?{" "}
                  <button onClick={() => switchMode("signup")} className="text-neon-cyan hover:underline">
                    Create one
                  </button>
                </div>
                <div>
                  <button onClick={() => switchMode("forgot")} className="text-white/55 hover:text-white">
                    Forgot password?
                  </button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div>
                Already have an account?{" "}
                <button onClick={() => switchMode("signin")} className="text-neon-cyan hover:underline">
                  Sign in
                </button>
              </div>
            )}
            {mode === "forgot" && (
              <div>
                <button onClick={() => switchMode("signin")} className="text-neon-cyan hover:underline">
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }
}

/** Reusable modal shell — backdrop, focus container, close button. */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="panel w-full max-w-sm space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
