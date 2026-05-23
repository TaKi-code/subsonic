import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ToastProvider } from "@/components/Toast";
import { PreviewProvider } from "@/lib/preview/PreviewProvider";

export const metadata: Metadata = {
  title: "SUBSONIC — AI crate-digging for DJs",
  description:
    "AI-powered music discovery and intelligent set creation: harmonic mixing, energy progression, and underground gems.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>
          <ToastProvider>
            <PreviewProvider>
            <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col">
              <Nav />
              <main className="flex-1 px-5 pb-24 pt-6 sm:px-8">{children}</main>
              <footer className="border-t border-white/5 px-5 py-6 text-center text-xs text-white/30 sm:px-8">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                  <span>SUBSONIC · AI crate-digging engine</span>
                  <span className="text-white/15">·</span>
                  <Link href="/privacy" className="hover:text-white/60">Privacy</Link>
                  <Link href="/terms" className="hover:text-white/60">Terms</Link>
                </div>
              </footer>
            </div>
            </PreviewProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
