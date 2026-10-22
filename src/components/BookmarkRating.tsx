import { cn } from "@/lib/utils";

/** Custom half-step rating using a bookmark icon instead of stars. */
export function BookmarkRating({
  value,
  onChange,
  size = 20,
  readOnly = false,
  className,
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}) {
  const shown = value ?? 0;
  const interactive = !readOnly && !!onChange;
  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-0.5",
        interactive &&
          "min-h-7 rounded-sm focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-ring",
        className,
      )}
      role={interactive ? undefined : "img"}
      aria-label={
        interactive
          ? undefined
          : value == null
            ? "Nessuna valutazione"
            : `Valutazione ${value} su 5`
      }
    >
      {[1, 2, 3, 4, 5].map((slot) => {
        const fill = Math.max(0, Math.min(1, shown - (slot - 1)));
        return (
          <span key={slot} className="relative" style={{ width: size, height: size }}>
            <Bookmark size={size} className="absolute inset-0 text-muted-foreground/40" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Bookmark size={size} filled className="text-primary" />
            </span>
          </span>
        );
      })}
      {interactive && (
        <>
          <span aria-hidden="true" className="ml-1 text-[9px] text-muted-foreground">
            ⌄
          </span>
          <select
            aria-label={
              value == null ? "Assegna una valutazione" : `Modifica valutazione: ${value} su 5`
            }
            value={value ?? ""}
            onChange={(event) =>
              onChange?.(event.target.value === "" ? null : Number(event.target.value))
            }
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            <option value="">Non valutato</option>
            {Array.from({ length: 11 }, (_, i) => i / 2).map((score) => (
              <option key={score} value={score}>
                {score} / 5
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

function Bookmark({
  size,
  filled,
  className,
}: {
  size: number;
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.2c0 .6-.7 1-1.2.6L12 16.8l-5.3 4a.75.75 0 0 1-1.2-.6V5A1.5 1.5 0 0 1 7 3.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
