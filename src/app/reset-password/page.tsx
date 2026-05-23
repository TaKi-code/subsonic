"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * Landing page for the "reset password" email link. By the time the user gets
 * here, Supabase has set a recovery session, so `updatePassword` just works.
 */
export default function ResetPasswordPage() {
  const { client, user, updatePassword, loading } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // After a successful update Supabase fires SIGNED_IN events; redirect home.
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => router.push("/"), 1500);
      return () => clearTimeout(t);
    }
  }, [done, router]);

  if (!client) {
    return (
      <div className="panel mx-auto max-w-md p-6 text-center text-white/55">
        Account features aren&apos;t configured on this deployment.
      </div>
    );
  }

  async function submit() {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setDone(true);
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <span className="label-cap">Account</span>
        <h1 className="mt-1 text-3xl font-bold text-white">Reset password</h1>
        <p className="mt-1 text-sm text-white/55">
          Choose a new password. You&apos;ll stay signed in afterward.
        </p>
      </div>

      <div className="panel space-y-3 p-6">
        {loading && <div className="text-sm text-white/45">Loading…</div>}

        {!loading && !user && !done && (
          <div className="text-sm text-neon-amber/90">
            We couldn&apos;t detect a recovery session. Make sure you opened this page from the link
            in the password-reset email.
          </div>
        )}

        {!done && user && (
          <>
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoComplete="new-password"
            />
            {error && <div className="text-xs text-neon-magenta">{error}</div>}
            <button onClick={submit} disabled={busy || !password || !confirm} className="btn-primary w-full">
              {busy ? "Updating…" : "Update password"}
            </button>
          </>
        )}

        {done && (
          <div className="text-sm text-neon-lime">
            ✓ Password updated. Taking you home…
          </div>
        )}
      </div>
    </div>
  );
}
