/** Lightweight dependency-free bar chart for daily counts. */
export default function MiniBarChart({ data = [], height = 120, color = 'from-brand-500 to-accent-500' }) {
  if (!data.length) {
    return <p className="py-8 text-center text-xs text-slate-400">No data yet</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d) => (
        <div key={d.date} className="group relative flex-1">
          <div
            className={`w-full rounded-t-md bg-gradient-to-t ${color} transition-all group-hover:brightness-125`}
            style={{ height: `${Math.max(4, (d.count / max) * height)}px` }}
          />
          <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
            {d.date}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}
