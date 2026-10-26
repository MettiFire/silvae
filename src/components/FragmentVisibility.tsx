import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { fragmentError, requireFragmentUser } from "@/lib/fragments";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { toast } from "@/lib/localized-toast";

export function FragmentVisibility() {
  const { user } = useAuth();
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
      toast.success("Visibilità aggiornata");
    } catch (error) {
      toast.error(fragmentError(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-5 rounded-xl border p-4">
      <label className="block text-sm">
        <UiText text="Chi può vedere i tuoi frammenti?" />
        <UiElement
          as="select"
          disabled={busy || settings.isPending || settings.isError}
          value={choice ?? settings.data ?? "private"}
          onChange={(event) => setChoice(event.target.value)}
          className="ml-2 rounded-lg border bg-background p-2"
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
    </div>
  );
}
