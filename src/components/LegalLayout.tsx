import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "./AppShell";
import { LEGAL } from "@/lib/legal";
export function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <AppShell>
      <article className="legal-page">
        <p className="eyebrow">Silvae / Informazioni legali</p>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{intro}</p>
        <p className="mt-4 text-xs text-muted-foreground">Ultimo aggiornamento: {LEGAL.updated}</p>
        {(!LEGAL.operatorName || !LEGAL.contactEmail) && (
          <p className="legal-draft" role="note">
            Documento in completamento: devono essere confermati i dati del gestore e il contatto
            per le richieste. Questa versione non è ancora l’informativa definitiva.
          </p>
        )}
        <div className="legal-copy">{children}</div>
        <nav
          aria-label="Documenti legali"
          className="mt-10 flex flex-wrap gap-6 border-t pt-5 text-sm"
        >
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Termini e condizioni</Link>
          <Link to="/">Torna a Silvae</Link>
        </nav>
      </article>
    </AppShell>
  );
}
export function LegalContact() {
  return (
    <p>
      Gestore e titolare del trattamento:{" "}
      <strong>{LEGAL.operatorName || "dati del titolare da confermare"}</strong>. Per richieste sul
      servizio e sui dati personali:{" "}
      {LEGAL.contactEmail ? (
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
      ) : (
        "indirizzo email da confermare"
      )}
      .
    </p>
  );
}
