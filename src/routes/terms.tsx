import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalContact, LegalLayout } from "@/components/LegalLayout";
import { pageSeo } from "@/lib/site-seo";
export const Route = createFileRoute("/terms")({
  head: () =>
    pageSeo(
      "Termini e condizioni — Silvae",
      "Le condizioni per utilizzare Silvae: account, librerie, recensioni, frammenti, contenuti degli utenti e cancellazione del servizio.",
      "/terms",
    ),
  component: Terms,
});
function Terms() {
  return (
    <LegalLayout
      title="Termini e condizioni"
      intro="Le regole per usare Silvae e condividere uno spazio dedicato alle letture."
    >
      <h2>1. Il servizio e il gestore</h2>
      <LegalContact />
      <p>
        Silvae permette di organizzare letture, salvare recensioni e liste, seguire autori e
        lettori, partecipare a sfide e raccogliere citazioni personali. I cataloghi e le
        integrazioni disponibili possono cambiare nel tempo.
      </p>
      <h2>2. Il tuo account</h2>
      <p>
        Fornisci informazioni corrette, custodisci le credenziali e usa soltanto account e
        dispositivi che sei autorizzato a collegare. Segnala al gestore eventuali accessi non
        autorizzati. Non usare l’identità di altre persone.
      </p>
      <h2>3. Contenuti e diritti</h2>
      <p>
        Resti responsabile dei contenuti che inserisci e mantieni i diritti che ti appartengono.
        Autorizzi Silvae a conservarli ed elaborarli per offrire le funzioni che richiedi e a
        mostrarli agli altri solo quando la funzione utilizzata li rende pubblici. I frammenti
        personali sono privati.
      </p>
      <p>
        Inserisci soltanto contenuti che hai il diritto di utilizzare. L’importazione delle
        sottolineature non autorizza a distribuire libri completi o estratti in violazione dei
        diritti degli autori e degli editori. Copertine, descrizioni e metadati di terzi restano
        soggetti ai diritti e alle condizioni dei rispettivi fornitori.
      </p>
      <h2>4. Uso corretto</h2>
      <p>
        Non sono consentiti contenuti illeciti, molestie, spam, impersonificazione, divulgazione di
        dati personali altrui senza titolo, tentativi di accesso non autorizzato o azioni che
        compromettono il servizio. Non aggirare le protezioni degli account o delle integrazioni.
      </p>
      <p>
        Per segnalare contenuti o comportamenti problematici usa il contatto del gestore, indicando
        il collegamento e il motivo della segnalazione. Il gestore può intervenire sui contenuti o
        limitare l’accesso per contrastare abusi e violazioni, fornendo le informazioni dovute e
        rispettando i diritti applicabili.
      </p>
      <h2>5. Importazioni, cataloghi e suggerimenti</h2>
      <p>
        Controlla l’anteprima delle importazioni e le associazioni tra titoli ed edizioni. I
        cataloghi esterni possono contenere errori o informazioni incomplete; voti aggregati e
        suggerimenti hanno natura informativa. Una sottolineatura non prova il completamento di un
        libro e non determina automaticamente il suo stato di lettura.
      </p>
      <h2>6. Disponibilità e responsabilità</h2>
      <p>
        Il servizio può essere temporaneamente indisponibile per manutenzione o problemi tecnici,
        anche presso fornitori esterni. Il gestore adotta misure ragionevoli per mantenerlo
        funzionante; questi termini non escludono responsabilità o diritti che la legge non consente
        di escludere.
      </p>
      <h2>7. Chiusura dell’account</h2>
      <p>
        Puoi eliminare il tuo account da{" "}
        <Link to="/settings" search={{ section: "data" }}>
          Impostazioni → Dati e account
        </Link>
        , quando la funzione è attiva, oppure contattando il gestore. La cancellazione è
        irreversibile e rimuove i dati personali collegati dal servizio attivo, secondo quanto
        indicato nella <Link to="/privacy">Privacy policy</Link>.
      </p>
      <h2>8. Modifiche e contatti</h2>
      <p>
        Le modifiche a questi termini sono riportate in questa pagina con la data di aggiornamento.
        Le modifiche sostanziali devono essere comunicate con modalità adeguate prima di produrre
        effetti, nel rispetto della legge. Restano salvi i diritti inderogabili previsti dalla
        normativa applicabile.
      </p>
    </LegalLayout>
  );
}
