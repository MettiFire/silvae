# Verifica Silvae — 25 ottobre 2026

## Ambito e limiti

Revisione della navigazione pubblica, del codice delle route e dei flussi coperti dalla suite (importazioni/date/sfide, identificazione opere, manga, profili, immagini, lettori e database). Prove nel browser come ospite su home, Esplora, scheda libro e percorso impostazioni → accesso; verifiche HTTP aggiuntive riportate sotto. Le funzioni private non sono state collaudate con un account reale: nessuna modifica o cancellazione di dati degli utenti.

Il sito pubblico osservato serve una versione precedente a HEAD iniziale `99debce`: ricerca Libri/Manga separata e vecchio frammento. Le correzioni sono quindi verificate sull'ultima sorgente locale; il push sincronizza Lovable, mentre la pubblicazione rimane separata.

## Correzioni

- Elenchi Open Library: restituzione immediata delle copertine del catalogo. Rimossi i passaggi seriali Google Dynamic Links che bloccavano tutta la lista, anche quando le copertine esistevano. Il recupero ISBN è conservato nel fallback delle copertine visibili e nel selettore delle edizioni. Nei casi senza copertina questo sposta l'attesa sulla singola immagine, senza bloccare gli altri libri.
- Alternative delle copertine: lingua inclusa nella chiave della cache e inoltrata alle ricerche Google/Open Library e manga. Le copertine personali mantengono la precedenza.
- Dettaglio Open Library: richiesta del record e ricerca dei metadati avviate in parallelo; i metadati supplementari possono fallire senza perdere il record principale.
- Google Books: cache server dei soli metadati pubblici, massimo 200 risposte per tre minuti; richieste simultanee identiche condividono il lavoro. Un HTTP 429 attiva un minuto di pausa per passare subito al catalogo alternativo, con ripresa automatica. Errori di rete, HTTP e JSON non vengono memorizzati come risultati validi. Le chiavi API restano sul server.
- Libreria e singolo libro: 30 secondi di riutilizzo tra schermate, un solo retry e cancellazione delle richieste del singolo elemento. I salvataggi continuano a invalidare immediatamente libreria e libro; il ritorno sulla finestra può aggiornare dati scaduti. Nessuna modifica alla rotazione dei suggerimenti.
- Catalogo Esplora: cinque minuti di riutilizzo per filtri identici e un solo retry. Collegamento “Modifica i tuoi gusti” corretto verso Impostazioni → Gusti di lettura.
- Lingua: utilizzo dello stato condiviso, senza un listener `languagechange` e un aggiornamento locale aggiuntivi per ogni copertina. Le query attendono che lo stato condiviso sia pronto.
- Copertina prioritaria: nessun IntersectionObserver inutile.
- Filtri Esplora e testi di accesso: corretta la traduzione dei testi che rimanevano in italiano con interfaccia inglese.
- Accesso: conservata la destinazione interna, compresa la sezione delle impostazioni, nei rinvii e nei percorsi password/Google. Destinazioni esterne, URL anomali e cicli verso `/auth` vengono rifiutati. Verificato nel browser il rinvio a `/auth?returnTo=...`; il completamento del login richiede un account reale e non è stato simulato come prova end-to-end.

## Misure HTTP del sito pubblico prima delle correzioni

Richieste singole curl, fino a tre contemporanee; secondi, senza emulazione mobile o cache fredda controllata. Queste misure descrivono il documento iniziale, **non** il caricamento completo, LCP o INP. Non sono un confronto prima/dopo: il sito pubblico non contiene ancora le modifiche.

| Percorso | HTTP | TTFB (s) | Totale (s) | Byte |
|---|---:|---:|---:|---:|
| / | 200 | 0.668527 | 0.669439 | 28792 |
| /discover | 200 | 0.770158 | 0.772052 | 29327 |
| /auth | 200 | 0.843641 | 0.843995 | 18600 |
| /privacy | 200 | 0.211769 | 0.214929 | 30573 |
| /terms | 200 | 0.162201 | 0.163297 | 27778 |
| /library | 200 | 0.421516 | 0.421828 | 15754 |
| /challenges | 200 | 0.402647 | 0.402878 | 15754 |
| /stats | 200 | 0.193649 | 0.193903 | 15754 |
| /this-page-does-not-exist | 404 | 0.167901 | 0.169637 | 16479 |
| /sitemap.xml | 200 | 0.411102 | 0.421889 | 338 |
| /robots.txt | 200 | 0.416607 | 0.416869 | 303 |
| /manifest.webmanifest | 200 | 0.385179 | 0.385350 | 724 |

La 404 restituisce correttamente HTTP 404; sitemap, robots e manifest rispondono 200. Le route private restituiscono il guscio HTML e richiedono accesso nel client; HTTP 200 non dimostra accesso ai dati.

L'API Google PageSpeed ha restituito HTTP 429, quota giornaliera esaurita. Nessun punteggio Lighthouse o incremento percentuale viene dichiarato. Il miglioramento verificabile è strutturale: nessuna ricerca seriale aggiuntiva delle copertine prima di mostrare una lista, condivisione delle richieste identiche e meno refetch durante la navigazione. Rimangono dipendenze dai tempi e dalla disponibilità dei cataloghi esterni.

## Verifiche

- Suite Node: 219 test superati, compresi test nuovi su cache, recupero dalla quota, separazione per lingua e validazione delle destinazioni del login.
- TypeScript: `npx tsc --noEmit`.
- Build di produzione e controllo dei segreti nel bundle client.
- ESLint sui file modificati.
- Il lint globale rimane non pulito per problemi di formattazione preesistenti: la scansione iniziale segnala 3.171 errori Prettier e 10 avvisi. Non è stata applicata una riformattazione massiva estranea ai difetti funzionali.

## Controlli da completare dopo Publish

Misurare Core Web Vitals sulla versione effettivamente pubblicata; verificare con un account di prova il completamento password/Google e i flussi privati (salvataggio, importazione, sfide, immagini). La suite automatica copre queste logiche, ma non sostituisce un collaudo autenticato dell'ambiente pubblico.
