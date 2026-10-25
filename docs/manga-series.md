# Manga come serie

La ricerca globale permette di scegliere Libri o Manga. Il catalogo manga usa metadati pubblici MangaDex con Jikan/MyAnimeList come secondo catalogo, via server, con cache limitata, timeout e coda di richieste; non occorre un account del catalogo. Una serie ha un identificativo stabile `manga:md:UUID` (o `manga:mal:ID` per le serie del secondo catalogo), una sola riga books/library_items e una sola scheda per voti, recensioni, liste e preferiti. Non vengono richiesti capitoli o file di lettura.

Nella scheda si indicano i singoli volumi letti, anche non consecutivi, oppure tutti quelli fino a un numero. È possibile modificare il totale della propria edizione e annotarne il nome (per esempio omnibus). Le serie in corso non vengono considerate concluse perché il numero provvisorio dei volumi è stato raggiunto; una serie conclusa si completa solo quando tutti i volumi dell’edizione scelta sono letti. Deselezionare un volume riapre la lettura. Fino a 2.000 volumi per serie, con paginazione di 48 controlli per volta, con copertine dei volumi disponibili e conferma quando si salta avanti.

I volumi sono salvati come intervalli compressi nel campo privato dell’account `manga_progress_v1`, secondo il modello già adottato dalle sfide. Le scritture leggono l’identità e lo stato aggiornato dell’account, modificano soltanto la serie interessata e mantengono le altre preferenze. Limite compresso 6.000 caratteri e 500 serie per non far crescere senza controllo i dati di autenticazione. Nessuna migrazione DB o nuova credenziale necessaria.

Dopo il salvataggio dei volumi viene aggiornata la sola riga della serie: Da leggere / In lettura / Letto e date di inizio/fine. I volumi non sono salvati nel campo pagine. Se il secondo aggiornamento fallisce, l’interfaccia comunica che i volumi sono salvati ma lo stato va riallineato con un nuovo Salva; non finge un’operazione atomica tra Auth e database.

Home e libreria mostrano il conteggio dei volumi. La libreria ha un filtro Formato; le statistiche aggiungono serie manga e volumi letti, mentre una serie completata vale una sola voce nei conteggi generali. Le statistiche dei volumi sono complessive e non per anno: non si inventano date dei singoli volumi. Le voci già importate come libri/volumi non vengono unite automaticamente. Lo storico privato dei volumi è ripreso se una serie rimossa viene aggiunta nuovamente; nei conteggi figurano soltanto le serie attualmente in libreria.

Il catalogo dichiara il totale dell’edizione originale: le edizioni locali possono differire. Se il catalogo non risponde, una scheda già memorizzata rimane utilizzabile; il totale può essere indicato manualmente. Il completamento già salvato non regredisce solo perché il catalogo è temporaneamente indisponibile.

Verifica: ricerca reale Naruto e scheda della serie con totale 72; modulo reale provato con fixture temporanea, letti 1–12 meno il 6 → 11 letti e prossimo 6; salvataggio e recupero di intervalli, scrittura simulata con account diverso/offline, date e stato di completamento, serie in corso, edizioni omnibus e mancato uso dei volumi come pagine. Griglia a 390px senza overflow. Fixture rimossa. Nessun account reale modificato durante le prove.

Aggiornamento: ricerca di “L’attacco dei giganti” verificata sul catalogo reale con serie principale al primo posto; provate entrambe le scelte del dialogo, annullamento, paginazione, salvataggio locale degli intervalli ed esclusione delle copertine originali con numerazione omnibus. La scheda pubblica mostra i 34 volumi e la galleria a 390px non deborda. Dettagli di lingua, fonti e fallback in `language-and-manga.md`.

### Resilienza del catalogo (25 ottobre 2026)

La ricerca e le schede MAL possono usare AniList quando MangaDex/Jikan non rispondono.
I risultati AniList riutilizzano l'identificativo MAL verificato dal catalogo; le serie
senza tale collegamento vengono escluse per evitare nuove identità duplicate. Le novel
sono escluse dalla ricerca. Se la chiamata server fallisce, il browser può tentare gli
stessi cataloghi pubblici, senza token o dati dell'account. La disponibilità delle
copertine dei singoli volumi resta legata a MangaDex.

### Unified search and compact volume tracking

Search defaults to All, with Books/Manga retained as optional filters. The merge
prefers an exact series result over its individual volume editions, while preserving
unrelated books with the same title. Manga results are marked as series. Search
can return a useful catalogue even if the other catalogue fails.

AniList is now the first manga-search provider, including an explicit creator
lookup and credited-work filter. Kentaro/Kentarou Miura and either name order
resolve to the same creator search. Live checks returned Berserk (MAL 2), Giganto
Maxia, Du-ran-ki, Japan and other credited works. MangaDex fallback includes the
mature `erotica` content rating so Berserk is not discarded; pornographic titles
remain outside the included ratings. AniList `isAdult` and novel filters remain.

The tracker is a single horizontal strip with 25-volume ranges, arrow/touch/keyboard
scrolling, a read count, Save and one jump control. The missing-predecessors dialog
is retained. Long manga are not labelled with invented seasons. The public gallery
uses the same horizontal presentation. At most 25 volume cards render at once.

Free-form edition names and manual edition totals have been removed from the form.
New progress follows catalogue numbering. Existing custom edition/total metadata
and read ranges are preserved; uncertain legacy numbering does not receive covers
from another edition. No reliable publisher-edition catalogue was available, so
this change does not offer a fictitious edition selector. Unknown ongoing totals
stay unknown; marking published volumes does not complete an ongoing series.
