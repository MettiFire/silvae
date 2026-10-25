# Silvae

**Tieni il filo di ogni storia.**

Silvae è una libreria personale e sociale per organizzare le letture, scoprire libri,
conservare i passaggi preferiti e condividere percorsi di lettura. Include libri,
graphic novel e serie manga, con un’interfaccia editoriale in tema chiaro e scuro.

[Apri Silvae](https://silvae.lovable.app) · [Segnala un problema](https://github.com/MettiFire/silvae/issues)

## Cosa puoi fare

- **Organizzare la libreria:** da leggere, in lettura, letti e abbandonati; date,
  avanzamento, riletture, preferiti, recensioni e valutazioni personali con le foglie.
- **Cercare e scoprire:** ricerca di libri, manga e autori, pagine autore con
  bibliografia e possibilità di seguirli. I suggerimenti combinano gusti dichiarati
  e libri già presenti in libreria, cercando di escludere edizioni e traduzioni
  delle opere possedute quando riconoscibili.
- **Seguire le serie manga:** una voce per serie e progresso per singolo volume,
  con conferma prima di segnare come letti i precedenti. Le graphic novel del
  catalogo libri rimangono invece voci separate: non hanno ancora un tracker di serie.
- **Partecipare alle sfide:** obiettivo annuale, vincitori di premi letterari,
  autori Nobel, paesi, generi, arretrati e alfabeto. Il progresso deriva dalla libreria;
  per gli obiettivi legati a un periodo sono necessarie date di lettura valide.
- **Conservare i frammenti:** citazioni personali, tag, preferiti e importazione
  delle sottolineature. La home propone anche un frammento del giorno da un archivio
  con fonti, preferenze di lingua e feedback sugli autori.
- **Condividere le letture:** profilo personalizzabile, follower, liste pubbliche
  o private e book club pubblici. L’email dell’account rimane privata.
- **Ritrovare lo storico:** statistiche per anno, calendario, filtri e diverse
  dimensioni della griglia. La navigazione indietro conserva schede e filtri.

La lingua dell’interfaccia può essere italiana, inglese o automatica; le impostazioni
permettono anche di scegliere la lingua dei libri e più lingue per i frammenti.
Titoli, copertine, descrizioni e riconoscimento delle opere dipendono dai cataloghi:
la disponibilità e la corrispondenza tra edizioni non sono garantite per ogni libro.

## Stack

- React 19, TypeScript, TanStack Start / Router / Query e Vite.
- Tailwind CSS, componenti Radix UI e Recharts.
- Supabase / Lovable Cloud per autenticazione, database e storage, con policy RLS.
- Open Library e Google Books per i libri; AniList, MangaDex e Jikan/MyAnimeList
  per la ricerca e i metadati manga.

I cataloghi forniscono metadati e immagini: Silvae non distribuisce ebook né
capitoli manga. I voti personali, la media della community e le valutazioni esterne
sono presentati come informazioni distinte.

## Avvio locale

Usa **Node.js 24 o successivo** per eseguire anche i test TypeScript tramite
il supporto nativo di Node. Per i prototipi dei lettori serve inoltre Python 3.10+.

```sh
git clone https://github.com/MettiFire/silvae.git
cd silvae
npm install
cp .env.example .env.local
npm run dev
```

Prima di avviare, compila `.env.local` con la configurazione pubblica del tuo
progetto Supabase:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_with_your_public_key
VITE_SUPABASE_PROJECT_ID=your-project
```

Le variabili `VITE_` sono visibili nel browser. Non inserirvi password, chiavi
`service_role`, chiavi private o segreti di servizi esterni.

Per un backend indipendente, applica le migrazioni in
[`supabase/migrations`](supabase/migrations) nell’ordine dei nomi e configura
le origini e gli URL di ritorno dell’autenticazione. Login Google, conferma email
e recupero password richiedono anche la configurazione dei rispettivi servizi;
la sola copia del frontend non li attiva.

## Comandi

| Comando | Funzione |
| --- | --- |
| `npm run dev` | Avvia lo sviluppo locale. |
| `npm run build` | Verifica le variabili pubbliche, compila e controlla i segreti nel bundle client. |
| `npm run preview` | Avvia l’anteprima della build. |
| `npm run lint` | Esegue ESLint. |
| `npx tsc --noEmit` | Controlla i tipi TypeScript. |
| `node --experimental-strip-types --test tests/*.test.mjs` | Esegue la suite Node, inclusi i test database locali con PGlite. |
| `npm run audit:client` | Ripete il controllo dei segreti su un bundle già compilato. |
| `npm run import:fragments` | Aggiorna l’archivio editoriale secondo le fonti e le regole dell’importatore. |

I test Python dei connettori sono separati:

```sh
python3 tests/kobo-export.test.py
python3 tests/reader-bridge.test.py
python3 tests/kindle-cloud-probe.test.py
```

## Importare libri e sottolineature

L’importatore libri accetta CSV generici, esportazioni Goodreads e Bookshelf,
compreso lo ZIP originale di Bookshelf. Offre anteprima, associazione delle colonne,
controlli su date e voti, gestione dei duplicati ed errori per riga. Il limite è
10 MB e 5.000 righe; gli ZIP hanno anche un limite sui dati CSV estratti.
Il file [`public/import-template.csv`](public/import-template.csv) è un esempio.

L’importatore Frammenti è distinto: supporta My Clippings del Kindle, CSV,
Bookshelf Cards e alcuni export testuali/HTML. Propone l’associazione al libro;
i casi incerti restano verificabili nell’anteprima. Importare sottolineature
non modifica automaticamente stato o date di lettura.

## Lettori ebook: stato delle integrazioni

La gestione è in **Impostazioni → Dispositivi**. Sono presenti un ponte locale USB,
un’integrazione sperimentale KOReader e strumenti di esportazione. **Non è disponibile
la sincronizzazione automatica nativa via Wi-Fi con gli account Kindle o Kobo.**
Il prototipo cloud Kindle è isolato e non aggiorna la libreria dell’app.

Requisiti, limiti e istruzioni sono in
[`docs/reader-integrations.md`](docs/reader-integrations.md).

## Pubblicazione e dati privati

Il progetto è collegato a Lovable: i commit su `main` si sincronizzano con l’editor.
Per aggiornare il sito pubblico occorre poi **Publish → Publish changes**.
Il push del codice non applica automaticamente le migrazioni del database né
conferma la distribuzione delle Edge Function.

- Mantieni i segreti server nella configurazione dell’hosting.
- Non aggiungere a Git sessioni Amazon, cookie, configurazioni personali dei lettori,
  database Kobo o esportazioni delle librerie degli utenti.
- `.gitignore` esclude gli ambienti locali e i file di sessione/configurazione dei
  dispositivi. Il `.env` già tracciato contiene soltanto configurazione pubblica
  Supabase: l’esclusione non rimuove i file già versionati.
- Le pagine Privacy e Termini sono nel footer. Se distribuisci una tua istanza,
  aggiorna il contatto in `src/lib/legal.ts` e il dominio in `src/lib/site-seo.ts`,
  `public/sitemap.xml` e `public/robots.txt`.
- Non riscrivere la cronologia già pubblicata: il collegamento Lovable la utilizza.

## Documentazione

- [Archivio del frammento del giorno e fonti](docs/daily-fragment-archive.md)
- [Voti personali, community e fonti esterne](docs/book-ratings.md)
- [Serie manga e progresso dei volumi](docs/manga-series.md)
- [Lingue dell’interfaccia e dei cataloghi](docs/language-and-manga.md)
- [Sfide, premi e provenienza delle opere](docs/challenge-archives-and-origins.md)
- [Profili e book club](docs/community-profile-release.md)
- [Controllo dei dati privati prima della pubblicazione](docs/publication-readiness-2026-10-25.md)

Alcuni documenti descrivono interventi e verifiche a una data specifica: non sono
una garanzia di disponibilità dei servizi esterni o dello stato del deploy corrente.
