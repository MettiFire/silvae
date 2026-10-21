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
