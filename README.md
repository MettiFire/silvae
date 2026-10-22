# Shelfysociety

Crea un'app web di tracking dei libri, una specie di Goodreads moderno, con queste caratteristiche.

Identità visiva e Design System (molto importante)
Doppio Tema (Light / Dark mode) con switch rapido e persistenza della preferenza (supporto automatico preferenze di sistema / toggle manuale).

Estetica "Editoriale & Carta":

Light Mode: Sfondo bianco carta caldo / leggermente giallino (stile pagina di libro/avorio naturale), card con contrasto morbido tono su tono, testo nero/antracite profondo ad alta leggibilità.

Dark Mode: Sfondo scuro profondo stile "carta carbone" / nero materico non piatto (evita il nero AMOLED puro #000000), card con leggeri bordi sottili e testo bianco avorio/chiaro.

Accento e Dettagli:

Colore accento: Rosso editoriale / terracotta sobrio (non troppo sgargiante o fluo, elegante e bilanciato per entrambi i temi).

Predisponi le variabili CSS/Tailwind per i colori di sfondo, card, testo e accento in modo che siano facilmente personalizzabili in seguito.

Tipografia: Inter per il testo/UI, Plus Jakarta Sans (o un font serif/sans editoriale moderno) per i titoli (caricali con <link> da Google Fonts).

Layout & Struttura:

Sidebar di navigazione a sinistra (icone + etichette): Home, Discover, La mia libreria, Sfide, Calendario, Social, Statistiche, Profilo.

Search bar globale in alto con dropdown di risultati live (copertina piccola, titolo, autore, anno).

Griglie di copertine con aspect ratio 2:3, angoli arrotondati (rounded-xl) e leggeri bordi discreti sia in light che dark mode.

Look generale: sobrio, elegante, pulito e letterario.

Logo: Un'icona semplice di un libro aperto (SVG custom pulito, no emoji) usata in sidebar, pagina di login e favicon.

Catalogo e dati
Usa un'API pubblica di libri per ricerca, dettagli e copertine (es. Google Books API o Open Library, senza bisogno di API key lato client).

Pagina dettaglio libro: Copertina ad alta risoluzione, titolo, autore (cliccabile → pagina autore con gli altri suoi libri), anno, numero pagine, generi/tag, descrizione espandibile ("mostra altro / meno" accessibile con aria-expanded), valutazione media della community.

Libreria personale
Stati di lettura: Da leggere, In lettura, Letto, Abbandonato.

Progresso di lettura per pagine: L'utente aggiorna "sono a pagina X di Y" con una progress bar dinamica; al 100% il libro passa automaticamente a "Letto".

Pagina "La mia libreria":

Tab suddivisi per stato (Da leggere / In lettura / Letti / Abbandonati).

Ricerca locale immediata per titolo/autore.

Toggle dimensione visualizzazione (griglia grande, griglia compatta o lista).

Filtri: preferiti, voto personale, genere, anno.

Rating personale: Scala 1-5 con mezzi voti (es. 4.5), usando un'icona custom (es. segnalibro o tazzina, NON le classiche stelle di Goodreads). Il voto è modificabile direttamente dalla scheda del libro e visibile sulle card in libreria.

Preferiti: Tasto rapido con icona cuoricino.

Riletture: Possibilità di segnare un libro come "riletto" (tenendo traccia delle date e dei conteggi per le statistiche).

Liste personalizzate
Creazione di liste custom pubbliche o private (es. "Classici da recuperare", "Migliori thriller").

Possibilità per gli utenti di sfogliare e salvare le liste altrui; compaiono nel profilo con badge dell'autore originale (@username e avatar).

Feedback visivo: quando un libro è già presente in una lista, il pulsante mostra "Aggiunto" con spunta e un menu contestuale per gestire le liste associate.

Social e Community
Profili pubblici: Username, avatar, banner, biografia, contatori follower/following.

Feed attività: Aggiornamenti in tempo reale degli amici (quando iniziano, finiscono, recensiscono o votano un libro).

Sezioni del profilo: Letti di recente, preferiti, liste create/salvate, statistiche rapide.

Reading Challenge (Sfide di lettura)
Obiettivo annuale personalizzabile (es. "30 libri nel 2026").

Progress bar dinamica che avanza automaticamente quando un libro passa allo stato "Letto".

Storico e archivio delle sfide degli anni precedenti.

Recensioni e Note
Recensione testuale completa associabile a ogni lettura/voto.

Feed recensioni visibile nella scheda del libro con data e profilo dell'utente.

Statistiche avanzate
Libri e pagine lette (totali, ultimi 7/30/90 giorni), con stima del tempo di lettura (ore/giorni).

Grafici interattivi: libri letti per mese, distribuzione per genere/autore, giorni della settimana più attivi.

Statistiche di completamento (libri iniziati vs finiti) e ritmo medio di lettura (pagine/giorno).

Discover e Raccomandazioni
Pagina Discover con filtri per generi, anno di pubblicazione, rating minimo e ordinamento per popolarità o novità.

Consigliati per te: Algoritmo client-side basato sui generi più letti, voti alti e preferiti.

Regola ferrea: non consigliare MAI libri già presenti nella libreria dell'utente.

Tasto "Non mi interessa" per scartare un libro ed evitare che ricompaia.

Tasto refresh / shuffle per rinnovare i suggerimenti.

Backend e Architettura (Lovable Cloud)
Autenticazione completa: registrazione/login via Email e Google.

Database relazionale con policy RLS (Row Level Security) attive: ogni utente può modificare solo i propri dati, mentre le liste/profili pubblici sono in sola lettura per gli altri.

Import da Goodreads: Pagina dedicata con upload file CSV esportato da Goodreads. I record vengono mappati e importati con il loro stato; i titoli con corrispondenza incerta finiscono in una sezione "Da verificare manualmente".

Roadmap di sviluppo prioritario:
Setup tema (Light/Dark mode su base carta/antracite + accento rosso) e componenti UI base.

Autenticazione e struttura database RLS.

Integrazione API libri e pagina dettaglio.

Gestione libreria (stati, progresso pagine, rating custom).

Liste custom, import Goodreads, sfide, social e statistiche.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://shelfysociety.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f0666a6b-d2d6-49db-a3d3-d2fa8b7360c8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Catalogue, authentication and CSV import

- Search uses Google Books with an 8-second timeout, then Open Library on errors or empty results. Open Library records are enriched with Google Books Dynamic Links thumbnails by ISBN, without requiring a Books v1 API key.
- Email/password registration, login, confirmation email, password recovery and Google sign-in use the existing Lovable Cloud project. In Cloud authentication settings, keep the published origin and `/auth?recovery=true` recovery URL allowed. Email delivery and OAuth must be verified with a real account on the published site.
- Import accepts comma, semicolon and tab-separated files, UTF-8/BOM and Windows-1252, quoted fields and multiline values. It previews columns before writing, supports manual mapping, validates dates/numbers and skips existing books by default. The explicit update option replaces imported fields on existing library entries.
- Uncertain matches are stored from CSV metadata with `needs_review=true`; missing reading dates stay unknown. Errors are reported per row. Cancelling keeps already saved books. The importer includes a user-scoped library reset with typed SVUOTA confirmation; profiles, reviews, lists and the shared books catalogue are preserved. The reset verifies the current session again before deletion.
- Example file: `public/import-template.csv`. File limit: 10 MB and 5,000 rows.

Validation (Node 24):

```sh
node --test tests/*.test.mjs
npx tsc --noEmit
npm run build
```

Pushes to the connected `main` branch synchronize source into Lovable. The public app is updated separately with **Publish → Publish changes** in the Lovable editor.

### Metadata recovery

Incomplete cached records now fetch their missing synopsis from Open Library work/edition endpoints. Search-result cache writes preserve previously saved descriptions and covers. Descriptions are rendered as plain text with paragraph breaks, never provider HTML. CSV files can also supply Description/Descrizione/Sinossi columns.

Cover lookup tries additional ISBNs (up to ten per work), and the UI rotates through distinct available editions on load errors/timeouts. A visible card without a usable cover searches for alternative editions with the same title AND author. Recovery does not guarantee coverage for every edition or invent descriptions. Goodreads no longer issues public API developer keys, so this integration uses Google Books and Open Library instead of scraping Goodreads.

### Bookshelf exports

The importer accepts Bookshelf-Books CSV files directly or the original Bookshelf ZIP. It recognizes Italian abbreviated/full month names, ratings such as 4/5, localized reading statuses, original Google Books IDs, publication year and categories. With a ZIP, Reading_History is joined by Book ID for progress and read counts. Fractions slightly above 1 are capped at 100% because some Bookshelf exports change page counts. Original Google IDs preserve the exported edition and its cover link instead of searching for a different work.

The preview explicitly identifies Cards (quotes/notes) and Collections as not imported. Standalone auxiliary files are rejected with instructions to choose Bookshelf-Books or the ZIP. ZIP parsing runs locally in the browser, capped at 10 MB compressed / 20 MB of extracted CSV data. No reading records are uploaded until the user confirms the preview.

## Reading challenge catalogue

The Challenges page keeps the existing annual goal and adds nine opt-in paths: Strega, Booker, International Booker, Nobel authors, Strega Europeo, a birth-year award journey, twelve countries, six genres/forms and a frozen backlog selection of 5/10/20 books.

Award facts in `src/data/reading-awards.ts` were checked on 2026-10-21 against the official linked sources. Coverage is Strega 1947–2026 (80 works), Booker 1969–2025 (60 works including joint winners), International Booker 2016–2026 (11 works under the single-book format), Strega Europeo 2014–2026 (14 works including the 2022 joint award), and Nobel 1901–2026 (123 laureates; years without awards have no slot). The yet-unannounced 2026 Booker winner is deliberately absent. Nobel awards match an author, not an invented winning book. Covers for 59 Booker/International Booker works were resolved by matching title and author to Open Library ISBNs and Google Books thumbnails; Strega cover URLs come from the official archives.

Subscriptions store only compact options and manual library associations in the user's existing Supabase Auth metadata (`reading_challenges_v1`, compressed JSON with legacy-array decoding). This is private, authenticated account preference storage, synchronized across devices without a database migration. Never use this user-editable field for authorization or a trusted public leaderboard. The adapter reloads the current account before merging an individual subscription and checks user identity before writing. Concurrent writes from different devices remain last-write-wins.

Progress is derived from current library records, never stored as a separate counter. Already-read books may count when selected at joining; date-constrained paths require a finished date. Joining-day readings and deadline-day readings count inclusively. A book or two equivalent editions cannot fill multiple slots within one challenge, but one book can advance separate challenges. Translations/alternate editions and thematic requirements can be explicitly associated from the reader's library. Countries use canonical ISO region codes to prevent duplicate spellings from inflating progress.

Subscribed year ranges and backlog book IDs are frozen at joining. Birth-year paths group joint winners into one yearly slot; the full prize paths give every joint-winning work its own slot. Leaving a challenge removes that subscription and its associations without changing library records or the annual goal. To change a path's scope, leave it and join again. To refresh award facts, verify the official archive, update the verification date and preserve existing stable winner IDs; never add nominees as winners. Award thumbnails are optional, and catalogue lookup remains available if a cover is unavailable.

Validation covers enrolment persistence/identity/error handling, automatic and manually linked progress, translations, Nobel author rules, joint winners, duplicate editions/countries, historical/date rules, frozen goals, malformed preferences and mobile/desktop UI flows. The browser preview uses synthetic local data rather than production user accounts.

### Gusti di lettura e consigli senza storico

Al primo accesso viene proposto un percorso facoltativo: 1–5 generi apprezzati,
fino a 5 generi da evitare e lunghezza preferita. Si modifica dal profilo e si
salva nel campo Auth `reading_preferences_v1`, indipendente da sfide e autori.
Chi salta riceve una selezione iniziale di generi diversi. Non serve uno storico
di altri utenti. Discover combina questi gusti con preferiti e voti personali,
penalizza i voti bassi, varia generi/autori e spiega i suggerimenti. La lunghezza
è un segnale morbido; le esclusioni di genere usano i metadati disponibili nel
catalogo e non equivalgono a una verifica dei contenuti. I doppioni della propria
libreria vengono esclusi anche per titolo/autore quando riconoscibili; traduzioni
con titoli diversi richiedono ancora un'identità di opera condivisa. Le scelte
"Non mi interessa" restano per identificativo del catalogo.

### Autori seguiti

Le pagine autore includono ricerca con disambiguazione degli omonimi, biografia,
foto, fonte Open Library e bibliografia paginata per identificativo stabile,
ordinabile per prima pubblicazione nota o titolo. Dal profilo si ritrovano gli
autori seguiti. La selezione è conservata nell'account in `followed_authors_v1`
(fino a 80 autori), senza modificare i libri o gli altri metadati.
La bibliografia si aggiorna consultando la pagina (cache di cinque minuti),
può includere traduzioni, ristampe, raccolte e voci duplicate del catalogo;
non è una garanzia di copertura completa o di anteprime editoriali. Questo
rilascio non invia notifiche automatiche o email sulle uscite.

### Dimensione copertine e rinnovo Discovery

Il selettore Copertine (grandi, medie, piccole) controlla le griglie di libreria,
Discovery, home, profili, liste e pagine autore. La scelta si conserva nel
browser; la libreria mantiene anche la vista elenco.
Home e Discovery condividono i consigli e rinnovano la selezione a ogni apertura/ricaricamento e con Rinnova:
una rotazione conservata nella sessione cambia le pagine del catalogo e varia
lievemente i punteggi a parità di affinità. Cataloghi piccoli possono riproporre
alcuni libri. Le fonti includono sia generi sia autori dei libri letti, in lettura
e da leggere; i non letti esprimono interesse con peso inferiore a preferiti e
voti alti, mentre i voti bassi restano segnali negativi. Le opere già presenti
in libreria continuano a essere escluse dai suggerimenti.

### Lingua, bibliografie e cronologia

I gusti includono la lingua dei libri: `auto` usa la lingua principale del
browser, una lingua esplicita la sostituisce, `any` rimuove il filtro. Le preferenze
precedenti restano valide e usano automaticamente il browser. Le lingue non
supportate ripiegano sull'inglese. Il filtro si applica ai consigli Home/Discovery
e al catalogo Discovery tramite `langRestrict` Google e filtro ISO639-2 Open
Library; per quest'ultimo si usano titolo e copertina dell'edizione corrispondente
quando presenti. La lingua dell'interfaccia e i libri già salvati non cambiano.

La pagina autore mostra un badge Letto per corrispondenze di ID, ISBN o
titolo+autore verificabili e ordina globalmente la bibliografia per uscita,
titolo o popolarità (aggiunte alle librerie Open Library, non media dei voti).
Le traduzioni con titoli diversi e prive di identificativi condivisi possono
non essere riconosciute automaticamente come già lette.

La libreria apre sulla sezione Letti con Ultimi letti: data di completamento o
ultima rilettura decrescente, date mancanti in fondo, senza usare la data di
modifica del voto. Sono disponibili anche primi letti, ultimi aggiunti e titolo;
le sezioni dei libri non conclusi partono dagli ultimi aggiunti.

### Frammenti e avanzamento ebook

La migrazione `supabase/migrations/20261022010000_fragments_and_reading_progress.sql`
va applicata al database Lovable Cloud prima di pubblicare questa versione. Il solo
push Git/Publish non conferma l'applicazione della migrazione. Quote e note sono
private tramite RLS; il cestino è reversibile. Non viene cancellato il catalogo.

Frammenti supporta inserimento dal libro, preferiti, tag, filtri, modifica e import
con anteprima e abbinamento esplicito del libro. Formati: Kindle My Clippings,
CSV generici e Bookshelf Cards (anche ZIP Bookshelf), Markdown, TXT e HTML con
blocchi di sottolineature riconoscibili. Note e segnalibri di My Clippings vengono
segnalati come esclusi. Per HTML non riconosciuti usare TXT/Markdown/CSV.
La reimportazione con lo stesso identificativo di origine non duplica i frammenti.

L'avanzamento percentuale è distinto dalle pagine stampate. L'API registra eventi,
scarta duplicati/eventi precedenti all'ultimo aggiornamento e separa le riletture.
Il completamento richiede una scelta esplicita. Questa versione non collega account
Amazon/Kobo e non sincronizza automaticamente dispositivi via Wi-Fi.

Prototipo Kobo locale (testato su database sintetico, da validare su un dispositivo):

```sh
python3 scripts/export-kobo.py /percorso/copia/KoboReader.sqlite --output /percorso/locale/export
```

Usare una copia del database ottenuta con il dispositivo inattivo. Lo script legge
SQLite in sola lettura, gestisce libri acquistati e caricati, non copia ebook né
aggira DRM. `kobo-fragments.csv` è importabile in Frammenti; `kobo-progress.csv`
serve solo all'ispezione e non viene sincronizzato automaticamente nell'app.
Non caricare database personali o esportazioni nella repository.

Verifica:

```sh
node --experimental-strip-types --test tests/*.test.mjs
python3 tests/kobo-export.test.py
npx tsc --noEmit
npm run build
```

I test database eseguono la migrazione reale in PostgreSQL locale tramite PGlite,
compresi RLS, isolamento utenti, deduplicazione, cestino e conflitti di avanzamento.

### Collegamenti Kindle/Kobo/KOReader

**Profilo → Gestisci dispositivi** (oppure voce **Dispositivi** nel menu) permette
ora di creare collegamenti personali revocabili e associare i documenti ricevuti
alle edizioni della propria libreria. Non viene richiesto il login Amazon/Kobo.

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
python3 reader-bridge.py --config paginae-device.json --path /Volumes/Kindle
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

### Esperimento locale: progresso cloud Kindle

`scripts/kindle-cloud-probe.py` prova a leggere posizione e data di sincronizzazione
tramite API private di Kindle per Web e a calcolare una **stima** percentuale dal
metodo documentato nel sorgente di [kindle-api](https://github.com/Xetera/kindle-api).
Richiede Python 3.10+ e una sessione locale configurata interattivamente con
`python3 scripts/kindle-cloud-probe.py --setup`. Cookie e parametri web-reader
rimangono in `~/.paginae/kindle-session.json` (permessi 0600); non vengono inviati
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

### Profilo pubblico e nuova interfaccia

`/profile` e `/u/:username` condividono il profilo di lettura: letti dal più recente,
da leggere, preferiti, liste, autori seguiti e collegamenti ai follower. La vista
personale permette di creare/modificare liste e visualizza anche quelle private;
le visite di altri utenti mostrano soltanto quelle pubbliche, con RLS nel database.
Le liste consentono aggiunta dalla libreria o ricerca nel catalogo.

I controlli personali sono in `/settings`, suddivisi in profilo, gusti, aspetto,
dispositivi e dati. `/devices` è mantenuto come redirect a
`/settings?section=devices`. Il connettore sperimentale cloud Kindle non è attivato.

Applicare `20261022030000_public_author_follows.sql` prima di pubblicare:
crea gli autori pubblici a partire dal solo campo `followed_authors_v1`, mantiene
invariati gli altri metadati e sincronizza i futuri cambiamenti tramite trigger.
Gli utenti possono leggere questa proiezione, non scriverla direttamente. La
migrazione aggiunge anche `book_community_rating`, media/count dei soli libri
completati con voto valido. La UI distingue questa media dal voto esterno e mantiene
un fallback per i database non ancora migrati.

La navigazione e il tema editoriale sono condivisi da tutte le sezioni. Le librerie
vengono lette in blocchi senza descrizioni integrali; le liste paginano 36 libri e
le anteprime dei profili richiedono quattro copertine. Logout/cambio account puliscono
la cache. Verificare la migrazione su un ambiente di prova e pubblicare su Lovable:
il push Git non conferma da solo l'avvenuta migrazione o il deploy pubblico.

### Eliminazione account

In **Impostazioni → Dati e account → Elimina account**, il lettore conferma scrivendo
`ELIMINA`. Il client verifica nuovamente l’identità e chiama `delete_own_account`.
Applicare sul backend la migrazione
`supabase/migrations/20261022040000_delete_own_account.sql` prima del Publish:
il solo push del codice non conferma che la funzione sia disponibile.

La funzione è eseguibile solo da utenti autenticati, confronta l’ID atteso con
`auth.uid()` e cancella esclusivamente il chiamante da `auth.users`. Le relazioni
`ON DELETE CASCADE` eliminano atomicamente i suoi dati personali, compresi i
frammenti e le credenziali dei dispositivi. I libri del catalogo condiviso e i dati
degli altri lettori rimangono. Nessuna chiave amministrativa viene esposta al browser.
Dopo il successo vengono svuotate le query personali e chiusa la sessione locale.
I test di cancellazione usano solo account sintetici nel database locale PGlite.

### Suggerimenti: opere, edizioni e traduzioni

Home ed Esplora escludono tutte le opere già in libreria, indipendentemente dallo
stato. Il confronto distingue l’ID dell’edizione dall’opera: gestisce diciture di
edizione, varianti delle iniziali dell’autore e associazioni di opere verificate
tramite ISBN oppure titolo/autore e titolo dell’edizione restituito da Open Library.
La ricerca usa termini liberi per trovare anche i titoli tradotti delle edizioni:
la documentazione è https://openlibrary.org/dev/docs/api/search.

Il riconoscimento aggiuntivo riguarda i candidati con autori presenti in libreria.
I risultati pubblici sono memorizzati in cache sul server (massimo 2.000 voci,
sette giorni per le associazioni riuscite), con richieste deduplicate e limitate.
Il client esegue al massimo due verifiche contemporaneamente e annulla le richieste
quando la pagina viene abbandonata. Se non è possibile distinguere una nuova opera
ad autore condiviso da una traduzione già posseduta, il suggerimento viene escluso;
le altre letture restano disponibili. Nessuna associazione approssimativa modifica
i libri, le copertine o i dati di lettura salvati. Non serve una migrazione SQL.

### Associazione dei clippings Kindle

L’importatore Frammenti riconosce insieme le sottolineature di ogni libro. Prima
cerca nella libreria e nei libri già collegati ai frammenti; gestisce iniziali e
nomi invertiti, diciture di edizione e traduzioni con identità dell’opera verificata.
Per i libri mancanti cerca nel catalogo e propone automaticamente una corrispondenza
con titolo/autore verificati. I casi ambigui restano selezionabili nell’anteprima;
la scelta si applica a tutte le sottolineature dello stesso libro. È disponibile
anche la ricerca manuale nel catalogo.

I nuovi libri vengono salvati nel catalogo solo quando si importa effettivamente
un frammento collegato. I libri esistenti non vengono riscritti. Le reimportazioni
riutilizzano i libri già associati e i fingerprint dei frammenti per evitare
nuovi duplicati. L’importazione non modifica stato, date o progresso di lettura.
Non sono richieste nuove migrazioni rispetto alla funzione Frammenti esistente.

### Privacy, metadati, risorse e verifica del lancio

Le pagine pubbliche `/privacy` e `/terms` sono raggiungibili dal footer e dalla
pagina di accesso. Nome e contatto del titolare sono in `src/lib/legal.ts`.
I testi descrivono il comportamento attuale; regione dei servizi, accordi con i
fornitori e conservazione dei backup vanno verificati nelle configurazioni effettive.

`src/lib/site-seo.ts` centralizza title, description, canonical e anteprima social
1200×630 (`public/images/paginae-social.png`, circa 34 KB). Le pagine personali e
di accesso hanno `noindex`. `public/sitemap.xml` include le pagine pubbliche statiche;
`public/robots.txt` indica la sitemap e limita i percorsi personali. Robots non è
un controllo di autorizzazione: l’accesso ai dati continua a dipendere da Auth e RLS.
Se cambia dominio, aggiornare SITE_URL, sitemap e robots insieme.

I font WOFF2 sono ospitati localmente con licenze OFL; non viene più caricata la
stylesheet di Google Fonts. Le copertine principali hanno priorità, mentre quelle
fuori vista vengono richieste solo entrando nel margine di visibilità. Le immagini
hanno dimensioni stabili e descrizioni alternative, tranne quelle decorative che
usano un alt vuoto. Copertine e foto di terzi rimangono erogate dai rispettivi host:
non viene introdotto un proxy di immagini esterno o una ricompressione non verificata.
`public/_headers` configura cache per font e immagini, dove supportato dall’hosting.

`npm run build` verifica automaticamente le variabili pubbliche prima della build
e analizza il bundle client al termine. Sono consentite solo le tre variabili
VITE del progetto Supabase; la chiave deve essere publishable o legacy anon.
Chiavi secret, JWT service_role, chiavi private, chiavi Google e valori di variabili
server sensibili bloccano l’audit se finiscono negli asset pubblici. I valori non
vengono stampati nei messaggi. `npm run audit:client` ripete il controllo del bundle.
Conservare i segreti backend nella configurazione dell’hosting, senza prefisso VITE_.

L’audit PageSpeed mobile del sito pubblicato prima di queste modifiche ha misurato
71 Performance, 96 Accessibility, 100 Best Practices e 100 SEO (22 ottobre 2026):
https://pagespeed.web.dev/analysis/https-paginae-lovable-app/bvtu7yx89i?form_factor=mobile
Un nuovo punteggio delle modifiche richiede Publish e una nuova analisi pubblica.
