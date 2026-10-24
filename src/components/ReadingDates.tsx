import { UiText, UiElement } from "@/lib/ui-language-context";
import { useState } from "react";
import { toast } from "@/lib/localized-toast";
import { type LibraryItem, useUpdateItem } from "@/lib/library";
import { parseDate } from "@/lib/csv-import";
import { readingDay, todayDay, validateReadingDates } from "@/lib/reading-dates";

export function ReadingDates({ item }: { item: LibraryItem }) {
  const update = useUpdateItem();
  const [started, setStarted] = useState(readingDay(item.started_at) ?? "");
  const [finished, setFinished] = useState(readingDay(item.finished_at) ?? "");
  const [error, setError] = useState("");
  const isRead = item.status === "read";
  return (
    <details className="mt-5 border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-medium">
        <UiText text="Date di lettura" />
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        <UiText
          text={
            isRead && !item.finished_at
              ? "Libro letto, data di fine sconosciuta: aggiungila per conteggiarlo nell’anno e nelle sfide con limiti temporali."
              : "Le sfide si aggiornano dalle date salvate. Lascia vuote quelle che non conosci."
          }
        />
      </p>
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (update.isPending) return;
          setError("");
          try {
            const start = parseDate(started),
              end = isRead ? parseDate(finished) : null;
            validateReadingDates(start, end);
            await update.mutateAsync({
              id: item.id,
              patch: { started_at: start, ...(isRead ? { finished_at: end } : {}) },
            });
            toast.success("Date di lettura aggiornate");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Date non salvate. Riprova.");
          }
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <UiText text="Inizio" />
          <UiElement
            as="input"
            type="date"
            aria-label="Data inizio lettura"
            max={todayDay()}
            value={started}
            onChange={(e) => setStarted(e.target.value)}
            disabled={update.isPending}
            className="rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        {isRead && (
          <label className="flex flex-col gap-1 text-sm">
            <UiText text="Fine" />
            <UiElement
              as="input"
              type="date"
              aria-label="Data fine lettura"
              max={todayDay()}
              min={started || undefined}
              value={finished}
              onChange={(e) => setFinished(e.target.value)}
              disabled={update.isPending}
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
        )}
        <button
          disabled={update.isPending}
          className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          <UiText text={update.isPending ? "Salvataggio…" : "Salva date"} />
        </button>
        {error && (
          <p role="alert" className="w-full text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
