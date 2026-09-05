export function WinProbMeter({
  home,
  draw,
  away,
}: {
  home: number;
  draw: number;
  away: number;
}) {
  const homeWidth = Math.max(home * 100, 0.5);
  const drawWidth = Math.max(draw * 100, 0.5);
  const awayWidth = Math.max(away * 100, 0.5);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-red-500" style={{ width: `${homeWidth}%` }} />
        <div className="h-full bg-zinc-500" style={{ width: `${drawWidth}%` }} />
        <div className="h-full bg-sky-500" style={{ width: `${awayWidth}%` }} />
      </div>
      <div className="flex justify-between text-[11px] tabular-nums text-zinc-500">
        <span className="text-zinc-400">{Math.round(home * 100)}%</span>
        <span>{Math.round(draw * 100)}%</span>
        <span className="text-zinc-400">{Math.round(away * 100)}%</span>
      </div>
    </div>
  );
}