import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KindleCloudStatus, KindleRegion } from "./kindle-cloud";

export const kindleCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: { owner: string; action: "poll" | "start" | "disconnect"; region?: KindleRegion }) => {
      if (!input || !["poll", "start", "disconnect"].includes(input.action))
        throw Error("Richiesta Kindle non valida.");
      if (input.action === "start" && input.region !== "it" && input.region !== "com")
        throw Error("Account Amazon non valido.");
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<KindleCloudStatus> => {
    if (data.owner !== context.userId) throw Error("L’account è cambiato. Ricarica la pagina.");
    const key = process.env["KINDLE_CLOUD_KEY"];
    if (!key || !/^[a-f0-9]{64}$/i.test(key))
      return {
        phase: "unavailable",
        message: "Il collegamento Kindle non è ancora configurato sul server.",
      };
    const { createCodePair, registerCodePair, openState, sealState, publicState, deregister } =
      await import("./kindle-cloud.server");
    const db = context.supabase as unknown as SupabaseClient;
    const rpc = async (name: string, args?: Record<string, unknown>) => {
      const result = await db.rpc(name, args);
      if (result.error) {
        if (["PGRST202", "42P01", "PGRST205"].includes(result.error.code))
          throw Error("Il collegamento Kindle richiede l’attivazione del database.");
        throw Error(
          result.error.message === "Attendi qualche secondo prima di riprovare."
            ? result.error.message
            : "Collegamento Kindle non disponibile. Riprova.",
        );
      }
      return result.data;
    };
    const saved = (await rpc("kindle_cloud_read")) as string | null;
    let previous;
    try {
      previous = saved ? openState(saved, context.userId, key) : null;
    } catch {
      throw Error(
        "Non riesco a leggere il collegamento Kindle. Contatta l’assistenza prima di riconfigurarlo.",
      );
    }
    if (
      data.action === "poll" &&
      (!previous || previous.phase === "connected" || previous.nextPollAt > Date.now())
    )
      return publicState(previous);
    const claim = (await rpc("kindle_cloud_claim", { p_start: data.action === "start" })) as {
      lease: string;
      ciphertext: string | null;
    } | null;
    if (!claim) {
      if (data.action !== "poll")
        throw Error("Collegamento in corso. Riprova tra qualche secondo.");
      return publicState(previous);
    }
    let state = claim.ciphertext ? openState(claim.ciphertext, context.userId, key) : null;
    let newlyRegistered: Extract<NonNullable<typeof state>, { phase: "connected" }> | null = null;
    try {
      if (data.action === "disconnect") {
        if (state?.phase === "connected") await deregister(state);
        state = null;
      } else if (data.action === "start") {
        if (!state || (state.phase === "pending" && state.expiresAt <= Date.now()))
          state = await createCodePair(data.region!);
      } else if (state?.phase === "pending") {
        if (state.expiresAt <= Date.now()) state = null;
        else if (state.nextPollAt <= Date.now()) {
          const connected = await registerCodePair(state);
          if (connected) {
            state = connected;
            newlyRegistered = connected;
          } else state = { ...state, nextPollAt: Date.now() + state.interval };
        }
      }
      const applied = await rpc("kindle_cloud_finish", {
        p_lease: claim.lease,
        p_ciphertext: state ? sealState(state, context.userId, key) : null,
      });
      if (!applied) {
        if (newlyRegistered) await deregister(newlyRegistered);
        throw Error("Il collegamento è cambiato durante l’accesso. Riprova.");
      }
      return publicState(state);
    } catch (failure) {
      const retryState =
        state?.phase === "pending" ? { ...state, nextPollAt: Date.now() + 60_000 } : state;
      await rpc("kindle_cloud_finish", {
        p_lease: claim.lease,
        p_ciphertext: retryState ? sealState(retryState, context.userId, key) : null,
      }).catch(() => undefined);
      if (
        failure instanceof Error &&
        /^(Amazon(?::| )|Risposta Amazon|Il collegamento|Collegamento)/.test(failure.message)
      )
        throw failure;
      throw Error("Amazon non è raggiungibile. Riprova tra poco.");
    }
  });
