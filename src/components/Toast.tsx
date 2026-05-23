"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLE: Record<ToastKind, string> = {
  success: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
  error: "border-neon-magenta/40 bg-neon-magenta/10 text-neon-magenta",
  info: "border-white/10 bg-white/5 text-white/80",
};

const ICON: Record<ToastKind, string> = { success: "✓", error: "⚠", info: "•" };

/**
 * Global toast notifications. Mounted once near the root; use `useToast()` in
 * any client component to surface success / error / info messages.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    // Errors stick a little longer so users can read them.
    const ttl = kind === "error" ? 5500 : 3500;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ttl);
  }, []);

  const value: ToastContextValue = {
    toast: push,
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
    info: (m) => push(m, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2 sm:right-6 sm:top-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-rise rounded-xl border px-4 py-2.5 text-sm font-medium shadow-glow backdrop-blur-sm ${STYLE[t.kind]}`}
          >
            <span className="mr-2 font-mono">{ICON[t.kind]}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** Helper for components rendered outside a provider in tests — no-op. */
export function useOptionalToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? { toast: () => {}, success: () => {}, error: () => {}, info: () => {} };
}
