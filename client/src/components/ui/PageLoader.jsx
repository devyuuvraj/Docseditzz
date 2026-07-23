import { cn } from '../../lib/utils.js';

export default function PageLoader({ fullscreen = false, label = 'Loading…' }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullscreen ? 'gradient-bg fixed inset-0 z-50 bg-surface-50 dark:bg-surface-950' : 'py-24'
      )}
    >
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 opacity-30 blur-lg" />
        <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-xl font-black text-white">
          D
        </div>
        <div className="absolute -inset-2 animate-spin rounded-3xl border-2 border-transparent border-t-brand-500" />
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
