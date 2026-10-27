# Integrazioni con i lettori ebook

Queste integrazioni sono sperimentali. Il collegamento Amazon tramite codice è
implementato; il recupero del progresso Kindle resta da validare. Non è un OAuth
Kindle ufficiale. La sincronizzazione cloud Kobo non è disponibile.

**Impostazioni → Dispositivi** mostra il collegamento web Amazon e la gestione degli
eventuali collegamenti precedenti. Il pannello “Collega un dispositivo”, la
generazione di nuove configurazioni USB/KOReader e i relativi download sono stati
rimossi dall'interfaccia. Le istruzioni locali seguenti documentano gli strumenti
già presenti nella repository e non richiedono il login Amazon/Kobo.

| Modalità | Dati | Requisito |
| --- | --- | --- |
| Kindle USB, incluso 11ª generazione | Evidenziazioni presenti in My Clippings, anche documenti caricati | Computer con Python 3.10+, lettore accessibile come disco, ponte in esecuzione |
| Kobo USB | Percentuale con data valida, completamento esplicito, citazioni e note | Computer con Python 3.10+, database Kobo accessibile, ponte in esecuzione |
| KOReader Wi-Fi | Posizione e percentuale | KOReader già installato, endpoint reader-sync attivo, sincronizzazione automatica abilitata |

Il Kindle originale **non sincronizza il progresso via Wi-Fi con questa app**.
Non è stato implementato un collegamento cloud universale: le API private Amazon
richiedono sessioni e infrastruttura non disponibili come normale autorizzazione
OAuth. La modalità KOReader non equivale a supporto nativo Kindle, non installa
KOReader e non decifra libri protetti. Non è stata provata su dispositivi reali.

Il ponte scaricabile dal sito corrisponde a `scripts/reader-bridge.py` (copia in
`public/downloads/reader-bridge.py`, verificata dai test). Legge soltanto metadati
e annotazioni, non i file ebook. La configurazione scaricata contiene una chiave
che autorizza esclusivamente l'invio a quel collegamento, non la lettura della
libreria. Il server conserva soltanto il suo hash. Non committare configurazioni,
cookie o database personali. Disconnessione e cancellazione dei frammenti sono
azioni distinte: la disconnessione conserva i dati già acquisiti.

Avvio (nella cartella contenente programma e configurazione):

```sh
python3 reader-bridge.py --config silvae-device.json --path /Volumes/Kindle
# oppure /Volumes/KOBOeReader; Ctrl+C interrompe il ponte
```

Il programma resta in primo piano, controlla ogni minuto e riprova dopo errori di
rete o scollegamento USB. Non parte da solo all'accensione del computer e non
funziona con il solo Wi-Fi del Kindle/Kobo originale. Kindle importa solo le
evidenziazioni riconoscibili: note, segnalibri e clipping non presenti nel file
non vengono trasferiti; non si deduce l'avanzamento dalle sottolineature.

**Attivazione backend:** applicare prima la migrazione Frammenti
`20261022010000_fragments_and_reading_progress.sql`, poi
`20261022020000_reader_connections.sql`. Distribuire la Edge Function
`supabase/functions/reader-sync` con `verify_jwt = false` come in config.toml.
Il controllo delle credenziali dei lettori rimane obbligatorio nel database;
non disattivare questo controllo. La funzione usa solo la chiave anon del progetto,
non un token amministrativo. Il ponte USB usa direttamente RPC e non dipende dalla
Edge Function. Infine verificare il flusso con un utente autenticato e pubblicare.

KOReader: aprire un libro → Progress sync → Custom sync server:
`https://<progetto>.supabase.co/functions/v1/reader-sync`. Scegliere **Login** con
username/password dedicati mostrati dalla pagina, non Registrati. La registrazione
anonima è disabilitata. Abilitare la sincronizzazione automatica e facoltativamente
i metadati. Il protocollo non fornisce l'ora della lettura: si usa l'ora di ricezione.
Dopo una modifica manuale nell'app, i progressi KOReader richiedono conferma in
Dispositivi. I progressi Kobo con timestamp precedente vengono ignorati. Una nuova
sessione di lettura richiede conferma dell'associazione; le citazioni non vengono
duplicate né sovrascrivono modifiche personali. Le modifiche manuali nell'app non
vengono inviate al lettore (nessuna posizione digitale viene inventata).

Fonti di protocollo consultate il 22 ottobre 2026:
- https://github.com/koreader/koreader/blob/master/plugins/kosync.koplugin/api.json
- https://github.com/koreader/koreader/blob/master/plugins/kosync.koplugin/main.lua
- https://github.com/koreader/koreader-sync-server
- https://github.com/Xetera/kindle-api

Test aggiuntivi: `python3 tests/reader-bridge.test.py`. La suite Node include
ora test PostgreSQL delle connessioni e test del protocollo HTTP KOReader.

## Esperimento locale: progresso cloud Kindle

`scripts/kindle-cloud-probe.py` prova a leggere posizione e data di sincronizzazione
tramite API private di Kindle per Web e a calcolare una **stima** percentuale dal
metodo documentato nel sorgente di [kindle-api](https://github.com/Xetera/kindle-api).
Richiede Python 3.10+ e una sessione locale configurata interattivamente con
`python3 scripts/kindle-cloud-probe.py --setup`. Cookie e parametri web-reader
rimangono in `~/.silvae/kindle-session.json` (permessi 0600); non vengono inviati
alla nostra app, a proxy o a host diversi da `read.amazon.com`.

```sh
python3 scripts/kindle-cloud-probe.py --limit 5 --output kindle-progress.local.json
python3 tests/kindle-cloud-probe.test.py
```

È una prova isolata: non abilita progresso per i collegamenti Kindle USB e non
aggiorna la libreria. Rifiuta date assenti, valori fuori scala e metadati di libri
diversi; conserva la posizione grezza per il confronto con il lettore. La sessione
non viene letta automaticamente dal browser e la password Amazon non viene chiesta.
Gli output non sovrascrivono file esistenti. Non caricare sessioni/cookie/HAR.

Validazione: sei test sintetici; endpoint reale senza credenziali risponde con
redirect al login. La lettura autenticata, la precisione della stima e la copertura
di acquisti/Send to Kindle **restano da provare con l'account e il Kindle reali**.
Non presentare questo prototipo come sincronizzazione funzionante o supporto
universale dei documenti personali.

### Collegamento Amazon nel browser

Impostazioni → Dispositivi → Kindle · Amazon usa un codice da autorizzare su
`amazon.it/code` o `amazon.com/code`. Non richiede di copiare URL dopo il login.
Il server registra un dispositivo software solo dopo l'approvazione su Amazon;
password e MFA rimangono sul sito Amazon. Non è un'integrazione ufficiale Kindle:
Amazon può identificare il profilo tecnico come Audible, senza abbonamenti.

Il server usa solo gli host Amazon consentiti, con timeout e senza redirect.
Il browser riceve codice pubblico e stato. Codice privato e credenziali sono
cifrati AES-256-GCM con AAD legata all'utente, in `kindle_cloud_connections`.
`KINDLE_CLOUD_KEY` (32 byte casuali, 64 caratteri esadecimali) è un segreto del
server Lovable, mai VITE. La tabella non concede accesso diretto ad anon o
authenticated. Le RPC sono isolate per auth.uid() e trasportano solo ciphertext;
nessuna espone la decifratura. Non ruotare la chiave senza migrare le credenziali.

Una lease atomica serializza registrazione, annullamento e scollegamento.
Il polling rispetta l'intervallo Amazon, si ferma sugli errori e fuori dalla
pagina. I codici scadono entro dieci minuti. Gli errori hanno un backoff di un
minuto. Scollega revoca solo il dispositivo Silvae su Amazon, poi elimina le
credenziali salvate. Se Amazon rifiuta la revoca, le conserva per riprovare.
Il logout non revoca il collegamento, che resta associato all'account.

Setup: applicare `supabase/migrations/20261027190000_kindle_cloud.sql`, impostare
il segreto e pubblicare. La migrazione è additiva e ripetibile; il rollback
applicativo può nascondere il componente senza eliminare dati.

**27 ottobre 2026:** Amazon.it e Amazon.com hanno restituito codici (HTTP 200,
scadenza 600 s). Questo prova la generazione, non l'accesso al progresso.
Una vera registrazione richiede l'approvazione dell'utente su Amazon.
La sincronizzazione resta disabilitata finché non è verificata.

**Prova pubblica e attivazione:** la prima richiesta del worker Lovable falliva;
sono emerse differenze rispetto a Node nella gestione dei redirect e degli input
alla cifratura. I redirect ora sono manuali e gli stati HTTP non riusciti vengono
rifiutati: nessuna credenziale segue un redirect. La cifratura riceve buffer UTF-8
espliciti. L'operatrice ha autorizzato e configurato `services/kindle` su Vercel
(Francoforte), con destinazioni fisse e firme Ed25519. La chiave di firma privata
resta su Lovable e quella pubblica su Vercel; la chiave di cifratura non è condivisa.
Il servizio rifiuta richieste prive di firma con HTTP 401. La generazione di un
codice non equivale all'autorizzazione dell'account e al recupero della lettura.

**Verifica sul sito pubblico:** Silvae ha generato un codice Amazon valido tramite
il servizio autorizzato, salvato lo stato cifrato e ripreso lo stesso tentativo
dopo un hard reload. L'interfaccia attende la conferma dell'account direttamente
su `amazon.it/code`. Nessun codice personale è riportato in questa documentazione.
L'operatrice ha autorizzato l'account e Silvae ha mostrato il collegamento riuscito
anche dopo un ricaricamento. Le credenziali sono quindi registrate e conservate,
non si tratta più di un controllo del formato di un link.

Il pannello esegue una prova in sola lettura dei metadati Kindle, al massimo ogni
cinque minuti durante le visite alle impostazioni. Il servizio ammette soltanto
un URL fisso `syncMetaData` e firme ADP prodotte dal server. Il contenuto della
risposta non viene salvato o inviato al browser; conserviamo soltanto l'esito del
controllo. Il log applicativo contiene lo stato HTTP e i nomi degli elementi XML,
senza valori, titoli o chiavi. I formati sconosciuti non sono trattati come una
libreria vuota. Riprova lettura Kindle permette una verifica manuale, con almeno
30 secondi tra le richieste.
La disponibilità dei metadati non dimostra ancora il recupero del progresso.

**Esito con l'account reale:** autorizzazione e registrazione riuscite; la richiesta
firmata `syncMetaData` ha risposto HTTP 200 con i campi di controllo del protocollo,
`add_update_list` e `removal_list`, senza elementi libro. Il collegamento è attivo,
ma questo feed del dispositivo software non espone ancora la lettura corrente.
Non equivale a una libreria Amazon vuota e non prova che altri endpoint non
possano esporre il progresso. L'interfaccia distingue questo esito dai formati
sconosciuti e conserva la sincronizzazione dei progressi disattivata.

Per Send to Kindle, [Flyleaf](https://github.com/tldev/flyleaf/blob/main/docs/kindle-endpoints.md)
documenta richieste firmate al sidecar CDE. Una posizione non assicura una
percentuale: serve un totale documentato nella stessa unità. Non usare dimensione
file, ultima annotazione o furthest-read come totale. Nessun ebook scaricato.

Il pannello collegato include una verifica tecnica per singolo identificativo
Amazon (PDOC per Send to Kindle, EBOK per acquisti). Usa la stessa autorizzazione
e lo stesso lease per evitare concorrenza con revoca/registrazione; risultati
recenti sono riutilizzati per 30 secondi. Solo un record esatto `kindle.lpr`
con posizione intera valida viene mostrato; note e citazioni non vengono
memorizzate o inviate al client. Eventuali record in conflitto sono un errore.
L'esito per libro è conservato insieme alle credenziali cifrate, separato dalle
statistiche della libreria. Nessun aggiornamento automatico o percentuale stimata.

**Verifica reale del 27 ottobre 2026:** richiesta firmata al sidecar PDOC riuscita
attraverso il relay e il pannello Silvae autenticato. Amazon ha restituito una
posizione intera e il timestamp dell'aggiornamento per un documento Send to Kindle
dell'account autorizzato. Identificativo, titolo e dati personali non sono nei
test o nel repository. Resta da verificare un totale attendibile e implementare
selezione/associazione automatica dei contenuti prima di abilitare la sync.

Riferimento: [Audible issue 906](https://github.com/mkb79/Audible/issues/906).
Client macOS separato e prova PKCE con URL incollato sono rimossi.
