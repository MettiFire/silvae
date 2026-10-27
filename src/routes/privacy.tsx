import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalContact, LegalLayout } from "@/components/LegalLayout";
import { pageSeo } from "@/lib/site-seo";
export const Route = createFileRoute("/privacy")({
  head: () =>
    pageSeo(
      "Privacy policy — Silvae",
      "Come Silvae tratta i dati del tuo account, delle letture e dei frammenti, quali informazioni sono pubbliche e come esercitare i tuoi diritti.",
      "/privacy",
    ),
  component: Privacy,
});
function Privacy() {
  return (
    <LegalLayout
      title="Privacy policy"
      intro="Quali dati usiamo, perché li usiamo e quali scelte hai a disposizione."
    >
      <h2>1. Chi gestisce i dati</h2>
      <LegalContact />
      <h2>2. Dati trattati</h2>
      <p>
        Quando crei un account trattiamo email, identificativo dell’account e credenziali di
        autenticazione tramite il servizio di accesso. Se scegli Google, il servizio riceve i dati
        del profilo autorizzati durante l’accesso, come nome, email e immagine. Non riceviamo la
        password del tuo account Google.
      </p>
      <p>
        Conserviamo le informazioni che inserisci: profilo, libreria, stati e date di lettura, voti,
        recensioni, liste, sfide, preferenze, autori seguiti, iscrizioni ai book club, discussioni e
        relazioni tra lettori. I frammenti possono contenere citazioni e note personali. I
        collegamenti ai dispositivi conservano identificativi tecnici e credenziali dedicate alla
        sincronizzazione; non richiediamo la password Amazon o Kobo in questo sito.
      </p>
      <p>
        Se colleghi Amazon, autorizzi un dispositivo software sul sito Amazon. Silvae conserva sul
        server le credenziali del dispositivo cifrate, senza inserirle nella cache del browser. Puoi
        revocare il collegamento da Impostazioni → Dispositivi. La password e i codici di verifica
        Amazon vengono inseriti esclusivamente su Amazon.
      </p>
      <p>
        Il funzionamento del servizio comporta il trattamento di dati tecnici, come indirizzo IP,
        richieste al server e informazioni necessarie alla sicurezza e alla gestione degli errori da
        parte dei fornitori dell’infrastruttura.
      </p>
      <h2>3. Cosa è pubblico e cosa è privato</h2>
      <p>
        Il profilo, le recensioni, le liste pubbliche, gli autori seguiti e le relazioni sociali
        possono essere consultati da altri visitatori. Foto e banner caricati per il profilo sono
        pubblici. I book club sono pubblici: iscrizioni, discussioni e risposte sono consultabili
        dagli altri utenti autenticati di Silvae. I dettagli della libreria e delle letture sono
        consultabili dagli altri utenti autenticati del servizio. Evita di inserire informazioni
        riservate nei campi condivisi.
      </p>
      <p>
        I frammenti, le note personali, le preferenze salvate nell’account, le liste impostate come
        private e le credenziali dei dispositivi sono accessibili solo al titolare dell’account
        attraverso le autorizzazioni del servizio. L’email di accesso non viene mostrata nel profilo
        pubblico.
      </p>
      <h2>4. Finalità e basi del trattamento</h2>
      <ul>
        <li>
          Fornire account, libreria, importazioni, liste, frammenti e funzioni sociali: esecuzione
          del servizio richiesto dall’utente, ai sensi dell’articolo 6, paragrafo 1, lettera b del
          GDPR.
        </li>
        <li>
          Proteggere gli account, prevenire abusi e correggere errori: legittimo interesse al
          funzionamento sicuro del servizio, ai sensi dell’articolo 6, paragrafo 1, lettera f, nel
          rispetto dei diritti degli utenti.
        </li>
        <li>
          Gestire obblighi di legge e richieste delle autorità competenti: adempimento di obblighi
          legali, ove applicabili.
        </li>
      </ul>
      <p>
        I suggerimenti usano generi e lunghezza preferiti e i libri della libreria, compresi stati,
        voti e autori. Non producono decisioni con effetti giuridici o analogamente significativi.
        Puoi cambiare i gusti nelle impostazioni.
      </p>
      <h2>5. Importazioni e servizi esterni</h2>
      <p>
        I file CSV, ZIP e My Clippings vengono letti nel browser. Vengono salvati i dati selezionati
        dopo la conferma dell’importazione. Per riconoscere un libro possono essere inviati titolo,
        autore o ISBN ai cataloghi esterni; il testo delle sottolineature non è necessario a questa
        ricerca.
      </p>
      <p>
        Il servizio usa Lovable per pubblicazione e infrastruttura, Supabase per autenticazione e
        database e Google Books e Open Library per dati bibliografici e copertine. L’accesso con
        Google è facoltativo. Immagini esterne, comprese quelle inserite nel profilo, vengono
        richieste al rispettivo fornitore, che riceve i dati tecnici della connessione.
      </p>
      <p>
        Per il catalogo manga vengono consultati MangaDex, Jikan/MyAnimeList e AniList. Le richieste
        ai metadati MangaDex passano attraverso un servizio Silvae ospitato su Vercel, che riceve
        gli identificativi delle serie o i termini di ricerca e i dati tecnici della connessione,
        senza credenziali dell’account o progressi di lettura.
      </p>
      <p>
        Se colleghi Amazon, le richieste di autorizzazione passano dal backend Silvae attraverso un
        servizio dedicato ospitato su Vercel. Questo servizio inoltra i codici e le credenziali
        necessari ad Amazon, senza salvarli o registrarli nei log applicativi. Le credenziali
        conservate da Silvae restano cifrate nel database; la chiave di cifratura rimane sul server
        Lovable.
      </p>
      <p>
        I fornitori possono trattare dati anche fuori dallo Spazio economico europeo. Supabase e
        Lovable descrivono nei propri accordi sul trattamento le garanzie applicabili, incluse le
        clausole contrattuali standard ove necessarie. Puoi chiedere al titolare informazioni sulla
        regione del progetto e sulle garanzie pertinenti. Consulta anche le{" "}
        <a href="https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq">
          informazioni Supabase sui trasferimenti
        </a>{" "}
        e la <a href="https://lovable.dev/privacy/">privacy policy di Lovable</a>.
      </p>
      <h2>6. Memorizzazione sul dispositivo</h2>
      <p>
        Per velocizzare le pagine, conserviamo in IndexedDB una copia locale della tua libreria, dei
        dettagli già consultati e delle copertine manga disponibili come indirizzi immagine. I dati
        vengono aggiornati in background, scadono dopo sette giorni e vengono rimossi al logout o al
        cambio di account. Puoi eliminarli anche cancellando i dati del sito nel browser. Questa
        cache non contiene password, token di accesso o frammenti privati.
      </p>
      <p>
        Usiamo archiviazione locale e meccanismi tecnici per mantenere la sessione e ricordare
        preferenze come tema, lingua e dimensione della griglia. Il codice applicativo non aggiunge
        strumenti pubblicitari o di analisi facoltativa. Eventuali strumenti aggiunti
        dall’infrastruttura devono essere valutati separatamente dal gestore.
      </p>
      <h2>7. Conservazione e cancellazione</h2>
      <p>
        I dati dell’account sono conservati per fornire il servizio finché l’account rimane attivo o
        fino alla cancellazione dei singoli dati. I frammenti spostati nel cestino restano
        conservati e possono essere ripristinati: il cestino non equivale a una cancellazione
        definitiva.
      </p>
      <p>
        Puoi richiedere la cancellazione dell’account da{" "}
        <Link to="/settings" search={{ section: "data" }}>
          Impostazioni → Dati e account
        </Link>
        . L’operazione elimina l’account e i dati personali collegati dal database attivo. Se non
        riesci a completare l’operazione puoi usare il contatto indicato in questa pagina. Il
        catalogo bibliografico condiviso resta disponibile. Log tecnici e copie di backup seguono i
        tempi di rotazione e conservazione previsti dal piano dei fornitori, che possono differire
        dalla cancellazione nel database attivo. La durata effettiva dipende dal servizio e dal
        piano utilizzato: puoi richiederne i dettagli al titolare. Non viene promessa una
        cancellazione istantanea da copie di backup non più utilizzate dal servizio attivo.
      </p>
      <h2>8. I tuoi diritti</h2>
      <p>
        Nei casi previsti dal GDPR puoi chiedere accesso, rettifica, cancellazione, limitazione,
        portabilità e opposizione al trattamento. Per esercitarli usa il contatto del titolare. Hai
        inoltre diritto di presentare reclamo all’autorità di controllo competente, tra cui il{" "}
        <a href="https://www.garanteprivacy.it/">Garante per la protezione dei dati personali</a>.
      </p>
      <h2>9. Aggiornamenti</h2>
      <p>
        Questa pagina viene aggiornata quando cambiano il servizio o le modalità di trattamento. La
        data riportata in alto identifica la versione del documento.
      </p>
    </LegalLayout>
  );
}
