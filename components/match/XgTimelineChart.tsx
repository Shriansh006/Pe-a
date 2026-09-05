import type { MatchTimelinePoint } from "@/lib/understat";

const W = 900;
const H = 170;
const PAD_BOTTOM = 26;
const PAD_TOP = 8;

export function XgTimelineChart({ timeline }: { timeline: MatchTimelinePoint[] }) {
  const maxMinute = timeline.length ? timeline[timeline.length - 1].minute : 0;
  const points = timeline.filter((p) => p.minute > 0);
  const maxXg = Math.max(0.1, ...points.map((p) => Math.max(p.homeXg, p.awayXg)));
  const innerH = H - PAD_BOTTOM - PAD_TOP;
  const band = W / Math.max(maxMinute, 1);
  const barW = band * 0.32;
  const gap = band * 0.08;
  const y = (v: number) => PAD_TOP + innerH - (v / maxXg) * innerH;

  const gridlines = [];
  for (let m = 15; m < maxMinute; m += 15) {
    gridlines.push(m);
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {gridlines.map((m) => (
          <line
            key={`g${m}`}
            x1={m * band}
            y1={PAD_TOP}
            x2={m * band}
            y2={H - PAD_BOTTOM}
            stroke="#27272a"
            strokeWidth={1}
          />
        ))}
        {points.map((p) => {
          const x0 = (p.minute - 1) * band + band * 0.18;
          return (
            <g key={p.minute}>
              <rect
                x={x0}
                y={y(p.homeXg)}
                width={barW}
                height={innerH + PAD_TOP - y(p.homeXg)}
                fill="#ef4444"
              />
              <rect
                x={x0 + barW + gap}
                y={y(p.awayXg)}
                width={barW}
                height={innerH + PAD_TOP - y(p.awayXg)}
                fill="#0ea5e9"
              />
            </g>
          );
        })}
        <line x1={0} y1={H - PAD_BOTTOM} x2={W} y2={H - PAD_BOTTOM} stroke="#3f3f46" />
        {gridlines.map((m) => (
          <text
            key={`t${m}`}
            x={m * band}
            y={H - 8}
            textAnchor="middle"
            fontSize={11}
            fill="#71717a"
          >
            {m}
          </text>
        ))}
        <text x={W} y={H - 8} textAnchor="end" fontSize={11} fill="#71717a">
          {maxMinute}
        </text>
      </svg>
    </div>
  );
}