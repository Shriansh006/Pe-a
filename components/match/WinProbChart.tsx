import type { MatchTimelinePoint } from "@/lib/understat";

const W = 900;
const H = 170;
const PAD_BOTTOM = 26;
const PAD_TOP = 10;

export function WinProbChart({ timeline }: { timeline: MatchTimelinePoint[] }) {
  const maxMinute = timeline.length ? timeline[timeline.length - 1].minute : 0;
  const innerH = H - PAD_BOTTOM - PAD_TOP;
  const x = (minute: number) => (minute / Math.max(maxMinute, 1)) * W;
  const y = (v: number) => PAD_TOP + innerH - v * innerH;

  const path = (get: (p: MatchTimelinePoint) => number) =>
    timeline
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.minute).toFixed(1)},${y(get(p)).toFixed(1)}`)
      .join(" ");

  const gridlines = [];
  for (let m = 15; m < maxMinute; m += 15) {
    gridlines.push(m);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <line x1={0} y1={y(0.5)} x2={W} y2={y(0.5)} stroke="#3f3f46" strokeDasharray="3 3" />
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
      <path d={path((p) => p.winHome)} fill="none" stroke="#ef4444" strokeWidth={2.5} />
      <path d={path((p) => p.winDraw)} fill="none" stroke="#a1a1aa" strokeWidth={2} />
      <path d={path((p) => p.winAway)} fill="none" stroke="#0ea5e9" strokeWidth={2.5} />
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