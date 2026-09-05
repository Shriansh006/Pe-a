import type { MatchTimelinePoint } from "@/lib/understat";

const W = 900;
const H = 170;
const PAD_BOTTOM = 26;
const PAD_TOP = 10;
const PAD_LEFT = 0;

export function CumulativeXgChart({ timeline }: { timeline: MatchTimelinePoint[] }) {
  const maxMinute = timeline.length ? timeline[timeline.length - 1].minute : 0;
  const maxCum = Math.max(
    0.1,
    ...timeline.map((p) => Math.max(p.homeCumXg, p.awayCumXg))
  );
  const innerH = H - PAD_BOTTOM - PAD_TOP;
  const innerW = W - PAD_LEFT;
  const x = (minute: number) => PAD_LEFT + (minute / Math.max(maxMinute, 1)) * innerW;
  const y = (v: number) => PAD_TOP + innerH - (v / maxCum) * innerH;

  const path = (get: (p: MatchTimelinePoint) => number) =>
    timeline
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.minute).toFixed(1)},${y(get(p)).toFixed(1)}`)
      .join(" ");

  const gridlines = [];
  for (let m = 15; m < maxMinute; m += 15) {
    gridlines.push(m);
  }
  const yLabels = [0, maxCum / 2, maxCum];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {gridlines.map((m) => (
        <line
          key={`g${m}`}
          x1={x(m)}
          y1={PAD_TOP}
          x2={x(m)}
          y2={H - PAD_BOTTOM}
          stroke="#27272a"
          strokeWidth={1}
        />
      ))}
      {yLabels.map((v) => (
        <text
          key={`y${v}`}
          x={W - 4}
          y={y(v) + 3}
          textAnchor="end"
          fontSize={10}
          fill="#52525b"
        >
          {v.toFixed(1)}
        </text>
      ))}
      <path d={path((p) => p.homeCumXg)} fill="none" stroke="#ef4444" strokeWidth={2.5} />
      <path d={path((p) => p.awayCumXg)} fill="none" stroke="#0ea5e9" strokeWidth={2.5} />
      <line x1={0} y1={H - PAD_BOTTOM} x2={W} y2={H - PAD_BOTTOM} stroke="#3f3f46" />
      {gridlines.map((m) => (
        <text
          key={`t${m}`}
          x={x(m)}
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
  );
}