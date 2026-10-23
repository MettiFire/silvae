import { Grid2X2, Grid3X3, LayoutGrid } from "lucide-react";
import { useBookDensity, setBookDensity } from "@/lib/book-density";
export function BookGridSizeControl({
  active = true,
  onSelect,
}: {
  active?: boolean;
  onSelect?: () => void;
}) {
  const density = useBookDensity();
  return (
    <div
      className="inline-flex items-center gap-1"
      role="group"
      aria-label="Densità della griglia dei libri"
    >
      {(
        [
          ["large", "Griglia ampia", LayoutGrid],
          ["standard", "Griglia media", Grid2X2],
          ["compact", "Griglia compatta", Grid3X3],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={active && density === value}
          onClick={() => {
            setBookDensity(value);
            onSelect?.();
          }}
          className={`rounded-lg border p-2 transition hover:bg-accent ${active && density === value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
