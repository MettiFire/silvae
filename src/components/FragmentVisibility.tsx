import { Globe, Lock, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useTranslate } from "@/lib/use-ui-language";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { fragmentError, requireFragmentUser } from "@/lib/fragments";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { toast } from "@/lib/localized-toast";

export function FragmentVisibility() {
  const { user } = useAuth();
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const settings = useQuery({
    queryKey: ["fragment-visibility", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fragment_preferences")
        .select("visibility")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.visibility ?? "private";
    },
  });
  const save = async () => {
    if (!user || !choice || busy) return;
    setBusy(true);
    try {
      await requireFragmentUser(supabase, user.id);
      const { error } = await supabase
        .from("fragment_preferences")
        .upsert({ user_id: user.id, visibility: choice });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["fragment-visibility"] });
      await qc.invalidateQueries({ queryKey: ["profile-fragments"] });
      setChoice(null);
      setOpen(false);
      toast.success("Visibilità aggiornata");
    } catch (error) {
      toast.error(fragmentError(error));
    } finally {
      setBusy(false);
    }
  };
  const Icon = settings.data === "public" ? Globe : settings.data === "followers" ? Users : Lock;
  const label = settings.isError
    ? "Visibilità"
    : settings.isPending
      ? "Caricamento…"
      : settings.data === "public"
        ? "Tutti"
        : settings.data === "followers"
          ? "I miei follower"
          : "Solo io";
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          setOpen(next);
          if (!next) setChoice(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={settings.isPending}
          aria-label={`${t("Visibilità dei frammenti")}: ${t(label)}`}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
        >
          <Icon size={14} aria-hidden="true" />
          <UiText text={label} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <label className="block text-sm">
          <UiText text="Chi può vedere i tuoi frammenti?" />
          <UiElement
            as="select"
            disabled={busy || settings.isPending || settings.isError}
            value={choice ?? settings.data ?? "private"}
            onChange={(event) => setChoice(event.target.value)}
            className="mt-2 w-full rounded-lg border bg-background p-2"
          >
            <option value="private">
              <UiText text="Solo io" />
            </option>
            <option value="followers">
              <UiText text="I miei follower" />
            </option>
            <option value="public">
              <UiText text="Tutti" />
            </option>
          </UiElement>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          <UiText text="La scelta vale per tutti i frammenti, comprese le note personali e i tag. I frammenti nel cestino restano privati." />
        </p>
        {settings.isError && (
          <p role="alert" className="mt-2 text-sm">
            {fragmentError(settings.error)}{" "}
            <button type="button" onClick={() => void settings.refetch()} className="underline">
              <UiText text="Riprova" />
            </button>
          </p>
        )}
        <button
          type="button"
          disabled={
            !choice || choice === settings.data || busy || settings.isError || settings.isPending
          }
          onClick={() => void save()}
          className="mt-3 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
        >
          <UiText text={busy ? "Salvataggio…" : "Salva visibilità"} />
        </button>
      </PopoverContent>
    </Popover>
  );
}
