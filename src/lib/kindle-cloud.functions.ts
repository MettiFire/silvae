import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  validKindleBook,
  type KindleBook,
  type KindleCloudStatus,
  type KindleRegion,
} from "./kindle-cloud";

// Local encrypted observations only: opening a book never triggers an Amazon request.
export const kindleBookObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { libraryId: string }) => {
    if (!input || !/^[a-f0-9-]{36}$/i.test(input.libraryId))
      throw Error("Richiesta Kindle non valida.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as SupabaseClient;
    const item = await db
      .from("library_items")
      .select("reading_session_id")
      .eq("id", data.libraryId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (item.error || !item.data) return null;
    const sessionId = item.data.reading_session_id;
    const key = process.env["KINDLE_CLOUD_KEY"];
    if (!key) return null;
    const saved = await db.rpc("kindle_cloud_read");
    if (saved.error || !saved.data) return null;
    const { openState } = await import("./kindle-cloud.server");
    const state = openState(saved.data, context.userId, key);
    if (state.phase !== "connected") return null;
    const mapping = Object.entries(state.mappings ?? {}).find(
      ([, map]) => map.libraryId === data.libraryId && map.sessionId === sessionId,
    );
    const observed = mapping ? state.positions?.[mapping[0]] : undefined;
    if (!observed?.checkedAt) return null;
    return {
      checkedAt: observed.checkedAt,
      status: observed.status,
      position: observed.position,
      recordCreatedAt: observed.updatedAt,
    };
  });

export const kindleCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      owner: string;
      action: "poll" | "start" | "disconnect" | "check" | "book" | "catalogue" | "sync";
      region?: KindleRegion;
      book?: KindleBook;
      consent?: boolean;
      libraryId?: string;
    }) => {
      if (
        !input ||
        !["poll", "start", "disconnect", "check", "book", "catalogue", "sync"].includes(
          input.action,
        )
      )
        throw Error("Richiesta Kindle non valida.");
      if (["book", "sync"].includes(input.action) && !validKindleBook(input.book))
        throw Error("Richiesta Kindle non valida.");
      if (["catalogue", "sync"].includes(input.action) && input.consent !== true)
        throw Error("Collegamento Kindle: autorizza prima l’accesso alla raccolta Amazon.");
      if (
        input.action === "sync" &&
        (typeof input.libraryId !== "string" || !/^[a-f0-9-]{36}$/i.test(input.libraryId))
      )
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
    const {
      createCodePair,
      registerCodePair,
      openState,
      sealState,
      publicState,
      deregister,
      probeKindleMetadata,
      probeKindleBook,
      kindleCatalogue,
      enrichKindleProgress,
    } = await import("./kindle-cloud.server");
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
    if (data.action === "disconnect") await rpc("kindle_cloud_automatic", { p_enabled: false });
    // Account status does not need another request to the known-empty device feed.
    if (data.action === "poll" && previous?.phase === "connected") return publicState(previous);
    if (
      ["poll", "check"].includes(data.action) &&
      (!previous ||
        (previous.phase === "connected" &&
          previous.reading &&
          previous.reading.checkedAt >
            Date.now() - (data.action === "check" ? 30_000 : 5 * 60_000)) ||
        (previous.phase === "pending" && previous.nextPollAt > Date.now()))
    )
      return publicState(previous);
    if (data.action === "book") {
      if (previous?.phase !== "connected") throw Error("Collegamento Amazon richiesto.");
      if (previous.bookReading && previous.bookReading.checkedAt > Date.now() - 30_000) {
        if (
          previous.bookReading.key === data.book!.key &&
          previous.bookReading.type === data.book!.type
        )
          return publicState(previous);
        throw Error("Attendi qualche secondo prima di riprovare.");
      }
    }
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
    let catalogue: import("./kindle-cloud").KindleCatalogue | undefined;
    let libraryMessage: string | undefined;
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
      if (["poll", "check"].includes(data.action) && state?.phase === "connected")
        state = { ...state, reading: await probeKindleMetadata(state) };
      if (data.action === "book") {
        if (state?.phase !== "connected") throw Error("Collegamento Amazon richiesto.");
        state = { ...state, bookReading: await probeKindleBook(state, data.book!) };
      }
      if (data.action === "catalogue") {
        if (state?.phase !== "connected") throw Error("Collegamento Amazon richiesto.");
        catalogue = await kindleCatalogue(state);
      }
      if (data.action === "sync") {
        if (state?.phase !== "connected") throw Error("Collegamento Amazon richiesto.");
        const item = await db
          .from("library_items")
          .select("id,book_id,status,started_at,updated_at,progress_updated_at,reading_session_id")
          .eq("user_id", context.userId)
          .eq("id", data.libraryId!)
          .maybeSingle();
        if (item.error || !item.data)
          throw Error("Collegamento Kindle: scegli un libro della tua libreria.");
        const mapKey = `${data.book!.type}:${data.book!.key}`;
        const mapping = state.mappings?.[mapKey];
        const sameSession =
          !!mapping &&
          mapping.libraryId === item.data.id &&
          mapping.sessionId === item.data.reading_session_id;
        let reading = await probeKindleBook(
          state,
          data.book!,
          undefined,
          sameSession ? mapping?.nativeVersion : undefined,
        );
        const enriched = await enrichKindleProgress(state, [reading]);
        reading = enriched.readings[0]!;
        const { applyKindleStatus, kindleObservation } =
          await import("./kindle-library-sync.server");
        const previous = sameSession ? state.positions?.[mapKey] : undefined;
        state = {
          ...state,
          bookReading: reading,
          totals: enriched.totals,
          positions: { ...state.positions, [mapKey]: kindleObservation(reading) },
          mappings: {
            ...state.mappings,
            [`${data.book!.type}:${data.book!.key}`]: {
              ...(sameSession ? mapping : {}),
              libraryId: item.data.id,
              sessionId: item.data.reading_session_id,
            },
          },
        };
        libraryMessage = await applyKindleStatus(db, context.userId, item.data, reading, previous);
      }
      const applied = await rpc("kindle_cloud_finish", {
        p_lease: claim.lease,
        p_ciphertext: state ? sealState(state, context.userId, key) : null,
      });
      if (!applied) {
        if (newlyRegistered) await deregister(newlyRegistered);
        throw Error("Il collegamento è cambiato durante l’accesso. Riprova.");
      }
      const result = publicState(state);
      return result.phase === "connected"
        ? {
            ...result,
            ...(catalogue ? { catalogue } : {}),
            ...(libraryMessage ? { libraryMessage } : {}),
          }
        : result;
    } catch (failure) {
      const retryState =
        state?.phase === "pending" ? { ...state, nextPollAt: Date.now() + 60_000 } : state;
      let retryCiphertext = claim.ciphertext;
      try {
        retryCiphertext = retryState ? sealState(retryState, context.userId, key) : null;
      } catch {
        // Keep the original encrypted state if the runtime cannot encrypt it.
      }
      await rpc("kindle_cloud_finish", {
        p_lease: claim.lease,
        p_ciphertext: retryCiphertext,
      }).catch(() => undefined);
      if (
        failure instanceof Error &&
        /^(Amazon(?::| )|Risposta Amazon|Il collegamento|Collegamento)/.test(failure.message)
      )
        throw failure;
      throw Error("Amazon non è raggiungibile. Riprova tra poco.");
    }
  });
