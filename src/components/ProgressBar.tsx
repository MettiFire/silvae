import { cn } from "@/lib/utils";

export function ProgressBar({
  current,
  total,
  className,
  showLabel = true,
  percentage,
}: {
  current: number;
  total: number;
  className?: string;
  showLabel?: boolean;
  percentage?: number | null | undefined;
}) {
  const explicit = percentage != null && Number.isFinite(Number(percentage));
  const pct = explicit
    ? Math.max(0, Math.min(100, Number(percentage)))
    : total > 0
      ? Math.min(100, Math.round((current / total) * 100))
      : 0;
  return (
    <div className={className}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className={cn("mt-1 text-xs text-muted-foreground")}>
          {explicit
            ? `${Math.round(pct * 100) / 100}%`
            : `${current} / ${total || "?"} pagine · ${pct}%`}
        </p>
      )}
    </div>
  );
}
