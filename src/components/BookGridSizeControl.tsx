import { useBookDensity, setBookDensity, type BookDensity } from "@/lib/book-density";
export function BookGridSizeControl() {
  const density = useBookDensity();
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Copertine
      <select
        aria-label="Dimensione delle copertine"
        value={density}
        onChange={(e) => setBookDensity(e.target.value as BookDensity)}
        className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
      >
        <option value="large">Grandi</option>
        <option value="standard">Medie</option>
        <option value="compact">Piccole</option>
      </select>
    </label>
  );
}
