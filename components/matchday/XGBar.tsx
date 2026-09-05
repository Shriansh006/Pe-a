export function XGBar({
  home,
  away,
  label = "xG",
}: {
  home: number | null;
  away: number | null;
  label?: string;
}) {
  if (home === null || away === null) {
    return (
      <div className="flex h-5 items-center justify-between px-1 text-[11px] text-zinc-500">
        <span>{label}</span>
        <span>—</span>
      </div>
    );
  }

  const total = home + away;
  const homeShare = total === 0 ? 50 : (home / total) * 100;
  const awayShare = 100 - homeShare;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-5 items-center justify-between px-1 text-[11px] tabular-nums text-zinc-400">
        <span className="text-red-400">{home.toFixed(2)}</span>
        <span className="text-zinc-600">{label}</span>
        <span className="text-sky-400">{away.toFixed(2)}</span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-red-500" style={{ width: `${homeShare}%` }} />
        <div className="h-full bg-sky-500" style={{ width: `${awayShare}%` }} />
      </div>
    </div>
  );
}