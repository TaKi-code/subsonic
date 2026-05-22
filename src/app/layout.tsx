import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { AuthProvider } from "@/lib/auth/AuthProvider";

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
          <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col">
            <Nav />
            <main className="flex-1 px-5 pb-24 pt-6 sm:px-8">{children}</main>
            <footer className="border-t border-white/5 px-8 py-6 text-center text-xs text-white/30">
              SUBSONIC · algorithmic crate-digging engine · seed library, no external keys required
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
