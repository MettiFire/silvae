import { UiText, UiElement } from "@/lib/ui-language-context";
import { cn } from "@/lib/utils";

/** Custom half-step rating using a leaf icon. */
export function LeafRating({
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
    <UiElement
      as="div"
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
            <RatingLeaf size={size} className="absolute inset-0 text-muted-foreground/40" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <RatingLeaf size={size} filled className="text-primary" />
            </span>
          </span>
        );
      })}
      {interactive && (
        <>
          <span aria-hidden="true" className="ml-1 text-[9px] text-muted-foreground">
            ⌄
          </span>
          <UiElement
            as="select"
            aria-label={
              value == null ? "Assegna una valutazione" : `Modifica valutazione: ${value} su 5`
            }
            value={value ?? ""}
            onChange={(event) =>
              onChange?.(event.target.value === "" ? null : Number(event.target.value))
            }
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            <option value="">
              <UiText text="Non valutato" />
            </option>
            {Array.from({ length: 11 }, (_, i) => i / 2).map((score) => (
              <option key={score} value={score}>
                {score} / 5
              </option>
            ))}
          </UiElement>
        </>
      )}
    </UiElement>
  );
}

function RatingLeaf({
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
        d="M20.5 3.5C11 2 4 6 4 12.5a7.5 7.5 0 0 0 7.5 7.5C18 20 22 13 20.5 3.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 21 15 9M8 16v-4M8 16h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
