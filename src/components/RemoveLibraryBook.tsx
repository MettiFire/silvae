import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRemoveItem } from "@/lib/library";
import { toast } from "@/lib/localized-toast";
import { UiText, UiElement } from "@/lib/ui-language-context";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
export function RemoveLibraryBook({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const remove = useRemoveItem();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!remove.isPending) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <UiElement
          as="button"
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 rounded px-1 py-1.5 text-xs text-muted-foreground hover:text-destructive focus-visible:outline focus-visible:outline-2"
          aria-label={`Rimuovi dalla libreria: ${title}`}
        >
          <Trash2 size={13} aria-hidden="true" />
          <UiText text="Rimuovi dalla libreria" />
        </UiElement>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <UiText text="Rimuovere questo libro?" />
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block font-medium text-foreground">{title}</span>
            <UiText text="Verranno rimossi dalla tua libreria stato di lettura, date, voto e avanzamento di questo libro. Potrai aggiungerlo di nuovo." />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            <UiText text="Annulla" />
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={remove.isPending}
            onClick={async (e) => {
              e.preventDefault();
              try {
                await remove.mutateAsync(id);
                setOpen(false);
                toast.success("Libro rimosso dalla libreria");
              } catch {
                /* The mutation displays the error. */
              }
            }}
          >
            <UiText text={remove.isPending ? "Rimozione…" : "Rimuovi dalla libreria"} />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
