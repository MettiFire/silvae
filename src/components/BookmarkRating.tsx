import { useState } from "react";
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
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={`Valutazione ${value ?? 0} su 5`}
    >
      {[1, 2, 3, 4, 5].map((slot) => {
        const fill = Math.max(0, Math.min(1, shown - (slot - 1)));
        return (
          <span key={slot} className="relative" style={{ width: size, height: size }}>
            <Bookmark size={size} className="absolute inset-0 text-muted-foreground/40" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Bookmark size={size} filled className="text-primary" />
            </span>
            {!readOnly && (
              <>
                <button
                  type="button"
                  aria-label={`${slot - 0.5} su 5`}
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(slot - 0.5)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onChange?.(value === slot - 0.5 ? null : slot - 0.5)}
                />
                <button
                  type="button"
                  aria-label={`${slot} su 5`}
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(slot)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onChange?.(value === slot ? null : slot)}
                />
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}

function Bookmark({ size, filled, className }: { size: number; filled?: boolean; className?: string }) {
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
