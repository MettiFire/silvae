import { Check, Loader2, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { type Book } from "@/lib/books";
import { STATUS_LABEL, useLibrary, useSaveToLibrary, type ReadingStatus } from "@/lib/library";
import { useTranslate } from "@/lib/use-ui-language";
import { UiText } from "@/lib/ui-language-context";
import { toast } from "@/lib/localized-toast";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function QuickAddBook({ book, className }: { book: Book; className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useTranslate();
  // Every control observes the same cached library, without one request per book.
  const { data: library = [], isPending, isError } = useLibrary(user?.id);
  const item = library.find((entry) => entry.book_id === book.id);
  const save = useSaveToLibrary();
  const unavailable = !!user && (isPending || isError);
  const label = t(item ? "Modifica stato di lettura" : "Aggiungi alla libreria");
  const statuses: ReadingStatus[] = ["read", "to_read", "reading"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={save.isPending || unavailable}
          aria-label={`${label}: ${book.title}`}
          aria-busy={save.isPending}
          title={unavailable ? t("Libreria non disponibile") : label}
          className={cn(
            "quick-add-book inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50",
            className,
          )}
        >
          {save.isPending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : item ? (
            <Check aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Plus aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        // The search popup's outside-click listener must not unmount this portal.
        onMouseDown={(event) => event.stopPropagation()}
      >
        {statuses.map((status) => (
          <DropdownMenuItem
            key={status}
            disabled={save.isPending || item?.status === status}
            onSelect={() => {
              if (!user) {
                void navigate({ to: "/auth" });
                return;
              }
              save.mutate(
                { book, status },
                { onSuccess: () => toast.success(t("Libreria aggiornata")) },
              );
            }}
          >
            <span className="flex-1">
              <UiText text={STATUS_LABEL[status]} />
            </span>
            {item?.status === status && <Check aria-hidden="true" className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
