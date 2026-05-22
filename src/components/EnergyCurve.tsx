"use client";

/**
 * SVG line chart of the energy curve across a set. `target` is the curve the
 * engine aimed for; `actual` is the energy of the tracks it picked.
 */
export function EnergyCurve({
  target,
  actual,
  height = 140,
}: {
  target: number[];
  actual?: number[];
  height?: number;
}) {
  const n = target.length;
  if (n === 0) return null;

  const w = 1000;
  const h = height;
  const padY = 14;
  const xs = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const ys = (e: number) => h - padY - (e / 10) * (h - padY * 2);

  const path = (data: number[]) =>
    data.map((e, i) => `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(e).toFixed(1)}`).join(" ");

  const area = `${path(target)} L ${xs(n - 1)} ${h} L ${xs(0)} ${h} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="ecFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22e5d6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22e5d6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ecLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="55%" stopColor="#22e5d6" />
            <stop offset="100%" stopColor="#ff2bd6" />
          </linearGradient>
        </defs>

        {[2, 4, 6, 8, 10].map((g) => (
          <line key={g} x1="0" x2={w} y1={ys(g)} y2={ys(g)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}

        <path d={area} fill="url(#ecFill)" />
        <path d={path(target)} fill="none" stroke="url(#ecLine)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {actual && (
          <path
            d={path(actual)}
            fill="none"
            stroke="rgba(182,255,60,0.7)"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinejoin="round"
          />
        )}

        {target.map((e, i) => (
          <circle key={i} cx={xs(i)} cy={ys(e)} r="3.5" fill="#05060a" stroke="#22e5d6" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-white/45">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-neon-cyan" /> Target curve
        </span>
        {actual && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-neon-lime" /> Selected tracks
          </span>
        )}
      </div>
    </div>
  );
}
