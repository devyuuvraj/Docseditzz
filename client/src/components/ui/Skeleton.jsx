import { cn } from '../../lib/utils.js';

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function FileCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5">
      <Skeleton className="mb-3 h-9 w-9 rounded-xl" />
      <Skeleton className="mb-2 h-6 w-20" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
