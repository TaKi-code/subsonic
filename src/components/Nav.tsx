"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/generator", label: "Set Builder" },
  { href: "/analyzer", label: "Analyzer" },
  { href: "/import", label: "Import" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-900/70 px-5 py-3.5 backdrop-blur-md sm:px-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-7 w-7 items-center justify-center">
            <span className="absolute inset-0 rounded-md bg-neon-cyan/20 blur-[6px] transition-all group-hover:bg-neon-cyan/40" />
            <span className="relative h-3 w-3 rounded-sm bg-neon-cyan shadow-glow animate-pulseglow" />
          </span>
          <span className="font-mono text-lg font-bold tracking-[0.2em] text-white">
            SUB<span className="text-neon-cyan">SONIC</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
