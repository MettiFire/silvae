import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KoboCloudStatus } from "./kobo-cloud";

export const koboCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      owner: string;
      action: "poll" | "start" | "disconnect" | "sync" | "bind" | "automatic";
      consent?: boolean;
      enabled?: boolean;
      bookId?: string;
      libraryId?: string;
    }) => {
      if (
        !input ||
        !["poll", "start", "disconnect", "sync", "bind", "automatic"].includes(input.action)
      )
        throw Error("Richiesta Kobo non valida.");
      if (input.action === "start" && input.consent !== true)
        throw Error("Autorizza prima il collegamento Kobo.");
      if (input.action === "automatic" && typeof input.enabled !== "boolean")
        throw Error("Richiesta Kobo non valida.");
      if (
        input.action === "bind" &&
        (!/^[a-f0-9-]{36}$/i.test(input.bookId ?? "") ||
          !/^[a-f0-9-]{36}$/i.test(input.libraryId ?? ""))
      )
        throw Error("Associazione Kobo non valida.");
      return input;
    },
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      status: KoboCloudStatus;
      automatic: boolean;
      result?: { changed: number; error?: boolean; checkedAt?: string };
    }> => {
      if (data.owner !== context.userId) throw Error("L’account è cambiato. Ricarica la pagina.");
      const key = process.env["KINDLE_CLOUD_KEY"];
      if (!key)
        return {
          status: {
            phase: "unavailable",
            message: "Collegamento Kobo non configurato sul server.",
          },
          automatic: false,
        };
      const db = context.supabase as unknown as SupabaseClient;
      const rpc = async (name: string, args?: Record<string, unknown>) => {
        const result = await db.rpc(name, args);
        if (result.error)
          throw Error(
            ["PGRST202", "42P01", "PGRST205"].includes(result.error.code)
              ? "Il collegamento Kobo richiede l’attivazione del database."
              : "Operazione Kobo non riuscita. Riprova.",
          );
        return result.data;
      };
      if (data.action === "disconnect") {
        await rpc("kobo_cloud_disconnect");
        return { status: { phase: "disconnected" }, automatic: false };
      }
      const {
        openKobo,
        sealKobo,
        publicKobo,
        startKobo,
        pollKobo,
        readKoboLibrary,
        koboUpdates,
        KoboError,
      } = await import("./kobo-cloud.server");
      const saved = await rpc("kobo_cloud_read");
      let state = saved?.ciphertext ? openKobo(saved.ciphertext, context.userId, key) : null;
      let automatic = !!saved?.automatic;
      if (data.action === "automatic") {
        if (state?.phase !== "connected") throw Error("Collega prima Kobo.");
        await rpc("kobo_cloud_automatic", { p_enabled: data.enabled });
        automatic = data.enabled!;
        return {
          status: publicKobo(state),
          automatic,
          ...(saved?.result ? { result: saved.result } : {}),
        };
      }
      if (
        data.action === "poll" &&
        (!state || state.phase === "connected" || state.nextPollAt > Date.now())
      )
        return {
          status: publicKobo(state),
          automatic,
          ...(saved?.result ? { result: saved.result } : {}),
        };
      const claim = await rpc("kobo_cloud_claim", { p_start: data.action === "start" });
      if (!claim) throw Error("Un controllo Kobo è già in corso. Riprova tra poco.");
      state = claim.ciphertext ? openKobo(claim.ciphertext, context.userId, key) : null;
      try {
        if (data.action === "start") {
          if (!state || (state.phase === "pending" && state.expiresAt <= Date.now()))
            state = await startKobo();
        } else if (data.action === "poll" && state?.phase === "pending")
          state = await pollKobo(state);
        else if (["sync", "bind"].includes(data.action)) {
          if (state?.phase !== "connected") throw Error("Collega prima Kobo.");
          if (data.action === "bind") {
            if (!state.books[data.bookId!]) throw Error("Scegli un libro della raccolta Kobo.");
            const item = claim.library.find((i: { id: string }) => i.id === data.libraryId);
            if (!item) throw Error("Scegli un libro della tua libreria.");
            state = {
              ...state,
              mappings: {
                ...state.mappings,
                [data.bookId!]: { libraryId: item.id, sessionId: item.reading_session_id },
              },
            };
          } else state = await readKoboLibrary(state);
        }
        const planned =
          state?.phase === "connected" && ["sync", "bind"].includes(data.action)
            ? koboUpdates(state, claim.library)
            : null;
        if (planned && state?.phase === "connected")
          state = { ...state, mappings: planned.mappings };
        const result = await rpc("kobo_cloud_finish", {
          p_lease: claim.lease,
          p_ciphertext: state ? sealKobo(state, context.userId, key) : null,
          p_updates: planned?.updates ?? [],
          p_error: false,
        });
        if (!result) throw Error("Il collegamento Kobo è cambiato. Riprova.");
        return { status: publicKobo(state), automatic, ...(result ? { result } : {}) };
      } catch (failure) {
        // Never persist a partially fetched catalogue or override a concurrent disconnect.
        await rpc("kobo_cloud_finish", {
          p_lease: claim.lease,
          p_ciphertext: state ? sealKobo(state, context.userId, key) : claim.ciphertext,
          p_updates: [],
          p_error: true,
        });
        throw Error(
          failure instanceof KoboError ? failure.message : "Collegamento Kobo non riuscito.",
        );
      }
    },
  );
