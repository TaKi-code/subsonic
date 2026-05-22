import Link from "next/link";
import { TRACKS } from "@/lib/data/tracks";

const FEATURES = [
  {
    href: "/discover",
    title: "Discover",
    accent: "#22e5d6",
    desc: "Crate-dig by genre, vibe, BPM, key, energy, label or artist. Surface hidden gems and find tracks similar to any seed.",
    points: ["Underground-first ranking", "Vibe / mood matching", "Similarity search"],
  },
  {
    href: "/generator",
    title: "Set Builder",
    accent: "#8b5cf6",
    desc: "Generate full sets with a real energy arc — warmup, peak-time, journey or closing — and harmonically locked transitions.",
    points: ["Energy progression curves", "Camelot harmonic flow", "Peak-time structure"],
  },
  {
    href: "/analyzer",
    title: "Analyzer",
    accent: "#ff2bd6",
    desc: "Drop in a playlist and get flow scoring, rough-transition flags, a smoother reorder, and gap-filling recommendations.",
    points: ["Transition quality audit", "Overplayed-track flags", "Reorder + suggestions"],
  },
];

export default function Home() {
  const undergroundCount = TRACKS.filter((t) => t.popularity < 45).length;

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-ink-700/80 to-ink-800/40 px-7 py-14 sm:px-12">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-neon-violet/20 blur-[80px]" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-neon-cyan/10 blur-[90px]" />
        <div className="relative max-w-2xl">
          <span className="label-cap">AI crate-digging engine</span>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Spend less time digging.
            <br />
            <span className="bg-gradient-to-r from-neon-violet via-neon-cyan to-neon-magenta bg-clip-text text-transparent">
              Build better sets.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60">
            SUBSONIC understands genre relationships, crowd energy, transition quality and the
            underground-vs-mainstream balance — so you find the right record and mix it the right way.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/generator" className="btn-primary">
              Generate a set →
            </Link>
            <Link href="/discover" className="btn-ghost">
              Explore the crate
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            <span className="text-white/50">
              <span className="font-mono text-lg font-bold text-neon-cyan">{TRACKS.length}</span> tracks indexed
            </span>
            <span className="text-white/50">
              <span className="font-mono text-lg font-bold text-neon-violet">{undergroundCount}</span> hidden gems
            </span>
            <span className="text-white/50">
              <span className="font-mono text-lg font-bold text-neon-magenta">5</span> source connectors
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="panel panel-hover group flex flex-col gap-3 p-6">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.accent, boxShadow: `0 0 12px ${f.accent}` }} />
              <h2 className="text-lg font-bold text-white">{f.title}</h2>
              <span className="ml-auto text-white/30 transition-transform group-hover:translate-x-1">→</span>
            </div>
            <p className="text-sm leading-relaxed text-white/55">{f.desc}</p>
            <ul className="mt-1 space-y-1.5">
              {f.points.map((p) => (
                <li key={p} className="flex items-center gap-2 text-xs text-white/45">
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: f.accent }} />
                  {p}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </section>

      <section className="panel p-7">
        <h3 className="text-sm font-semibold text-white/80">How the engine thinks</h3>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Harmonic mixing", "Camelot-wheel compatibility scores every transition; relative keys and ±1 moves rank highest."],
            ["Energy progression", "Each set shape maps to an energy curve; tracks are fitted slot-by-slot to the target arc."],
            ["Underground balance", "Inverse-popularity scoring surfaces deep cuts and flags overplayed anthems."],
            ["Genre relationships", "An affinity graph knows that deep house blends into tech house but clashes with hard techno."],
            ["Transition quality", "Harmony, BPM proximity, energy continuity and genre affinity combine into one flow score."],
            ["Peak-time structure", "Curves encode warmup builds, sustained peaks and comedown closings the way a room actually moves."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-white/5 bg-ink-800/50 p-4">
              <div className="font-medium text-white/85">{t}</div>
              <div className="mt-1 text-xs leading-relaxed text-white/50">{d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
