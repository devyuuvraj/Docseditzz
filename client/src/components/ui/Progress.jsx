import { cn } from '../../lib/utils.js';

export default function Progress({ value = 0, className, showLabel = false }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('w-full', className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">{Math.round(pct)}%</p>
      )}
    </div>
  );
}
