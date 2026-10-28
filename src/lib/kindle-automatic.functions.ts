import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
export type KindleAutomaticStatus = {
  enabled: boolean;
  since?: string;
  result?: {
    checkedAt: string;
    changed: number;
    unknown: number;
    unmatched: number;
    error: boolean;
  } | null;
};
export const kindleAutomatic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { owner: string; enabled?: boolean; consent?: boolean }) => {
    if (
      !data ||
      typeof data.owner !== "string" ||
      (data.enabled !== undefined && typeof data.enabled !== "boolean") ||
      (data.enabled === true && data.consent !== true)
    )
      throw Error("Autorizza prima la sincronizzazione automatica Kindle.");
    return data;
  })
  .handler(async ({ data, context }): Promise<KindleAutomaticStatus> => {
    if (data.owner !== context.userId) throw Error("L’account è cambiato. Ricarica la pagina.");
    const db = context.supabase as unknown as SupabaseClient;
    if (data.enabled === true) {
      if (!process.env["KINDLE_JOB_KEY"])
        throw Error("Sincronizzazione automatica non ancora configurata.");
      const result = await db.rpc("kindle_cloud_read");
      const { openState } = await import("./kindle-cloud.server");
      if (
        result.error ||
        !result.data ||
        openState(result.data, context.userId, process.env["KINDLE_CLOUD_KEY"] ?? "").phase !==
          "connected"
      )
        throw Error("Collega prima Amazon.");
    }
    const result = await db.rpc(
      "kindle_cloud_automatic",
      data.enabled === undefined ? {} : { p_enabled: data.enabled },
    );
    if (result.error) throw Error("Sincronizzazione automatica non disponibile. Riprova.");
    return result.data as KindleAutomaticStatus;
  });
