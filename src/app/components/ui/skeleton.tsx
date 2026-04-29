interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />
  );
}

export function KanbanCardSkeleton() {
  return (
    <div className="w-full rounded-xl bg-white/5 border border-white/10 p-3 space-y-2 animate-pulse">
      <div className="flex items-center gap-2">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      <Skeleton className="h-4 w-4/5 rounded" />
      <Skeleton className="h-3 w-3/5 rounded" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
    </div>
  );
}

export function BoardColumnSkeleton() {
  return (
    <div className="w-[300px] shrink-0 rounded-xl border border-white/10 bg-white/5 flex flex-col">
      <div className="p-4 border-b-2 border-white/10 animate-pulse">
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      <div className="p-3 space-y-3 flex-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <KanbanCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
