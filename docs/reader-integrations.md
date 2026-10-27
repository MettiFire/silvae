# Integrazioni con i lettori ebook

Queste integrazioni sono sperimentali. La sincronizzazione cloud nativa di Kindle
e Kobo è in pausa; non è disponibile un collegamento OAuth agli account Amazon/Kobo.
Le istruzioni seguenti documentano il ponte locale e i prototipi presenti nella repo.

**Impostazioni → Dispositivi** mostra la prova web Kindle e la gestione degli
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

### Documenti Send to Kindle: percorso ancora da verificare

La sincronizzazione della stessa posizione tra lettore e app Kindle conferma il
percorso cloud Amazon, ma non dimostra che il lettore web esponga quel documento
alle API usate dal prototipo. Non si devono confondere questi due test.

Il progetto [Flyleaf](https://github.com/tldev/flyleaf/blob/main/docs/kindle-endpoints.md)
documenta un percorso distinto per i documenti personali: registrazione di un
dispositivo software Amazon e richieste firmate al servizio delle annotazioni.
I suoi test descrivono limiti del percorso web per i PDOC e l'assenza di un totale
posizioni affidabile per calcolare una percentuale esatta. Queste osservazioni
sono del progetto upstream e non sono state validate con Silvae.

La prima parte è ora in **Impostazioni → Dispositivi → Kindle · prova di accesso
web**. Il client macOS separato è stato rimosso. Nessun nuovo dispositivo viene
registrato da questa interfaccia.

I link Amazon.it e Amazon.com sono stati verificati in schede autonome del browser
Codex: raggiungono le pagine di accesso. Amazon restituisce `X-Frame-Options:
SAMEORIGIN` e `Content-Security-Policy: frame-ancestors 'none'`; il login non può
essere incorporato nell'anteprima Lovable. **Copia link Amazon** consente di aprire
l'indirizzo direttamente nella barra di una nuova scheda del browser, mantenendo
aperta la pagina Silvae con il tentativo in memoria. Se anche gli appunti sono
bloccati dal riquadro, compare un campo selezionabile per la copia manuale. Il
fallback è stato provato con la scrittura negli appunti negata da un iframe.

La selezione esplicita di nessun lettore nasconde e smonta tutte le sezioni dei
collegamenti immediatamente, prima del salvataggio della preferenza. Non rimuove
i collegamenti già conservati nel database. Scegliendo nuovamente un lettore, i
controlli tornano visibili. Le preferenze non ancora specificate mantengono il
comportamento precedente.

La prova web genera un tentativo PKCE distinto, apre il login Amazon in una nuova
scheda e permette di incollare l'indirizzo finale Amazon. Può comparire il marchio
Audible, perché il protocollo privato usa quel flusso tecnico. Password e MFA
rimangono esclusivamente su Amazon. Il verifier PKCE è temporaneo e resta nella
memoria del componente, come in un public client OAuth; non è una credenziale
Amazon, un token permanente o una chiave condivisa del servizio. Non viene salvato
in cache, localStorage, sessionStorage, URL, log o database.

**Ritorno 404:** `/ap/maplanding` può restituire una pagina 404 pur contenendo
`openid.oa2.authorization_code` nell'indirizzo. In quel caso si copia comunque
l'indirizzo finale nel campo della prova. Una pagina 404 senza codice non è un
esito utilizzabile. Questo comportamento è documentato anche nella
[discussione upstream](https://github.com/chemelli74/aioamazondevices/issues/1188).
Le istruzioni lo spiegano prima del controllo del ritorno; indirizzi e codici
reali non sono inclusi in documentazione, log o test.

Il controllo di ritorno verifica solo formato, host, percorso, regione, account
Silvae corrente e scadenza del tentativo (dieci minuti). **Non prova la validità
del codice presso Amazon e non equivale a un account collegato.** L'indirizzo
incollato viene svuotato dopo il controllo e il codice non viene conservato.
Annullamento, cambio account e uscita dalla pagina eliminano il tentativo locale.

Registrazione, scambio del codice, custodia cifrata delle credenziali sul server e
polling del progresso non sono ancora implementati. Richiederanno una transazione
server autenticata e verificata; il controllo client non deve diventare una prova
di autorizzazione. Le API private potrebbero rifiutare il flusso web, e il limite
sulla percentuale dei documenti personali rimane da verificare.

