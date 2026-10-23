# Albi completi e provenienza dei libri

I cinque percorsi dei premi usano sempre tutto l’albo verificato, senza filtro per anni, data d’iscrizione o scadenza. Contano i libri Letti, anche senza data di fine nota; le date future restano escluse. Le tappe comprendono tutti i vincitori, anche ex aequo. Il Nobel continua a richiedere un’opera per ogni autore premiato. La percentuale è calcolata sul totale dell’albo. La lista carica venti tappe alla volta per limitare il peso delle immagini.

Le iscrizioni precedenti vengono normalizzate in lettura, conservando identità e associazioni delle tappe. Nessun aggiornamento massivo agli account o migrazione database. Nuovi vincitori vanno aggiunti al catalogo verificato; il denominatore si aggiorna anche per le vecchie iscrizioni. La sfida «Il tuo anno letterario» conserva la scelta degli anni; le sfide tematiche conservano le regole sulle date.

Per «Dodici mesi, dodici paesi» il criterio è la cittadinanza documentata dell’autore, Wikidata P27, risolta su paesi con codice ISO supportato. Non si deduce il paese dalla lingua di una traduzione, dalla lingua originale, dall’ambientazione o dal luogo di pubblicazione. Più cittadinanze documentate possono proporre più paesi; un’opera conta una sola volta. Stati storici e identità ambigue non vengono convertiti arbitrariamente in stati odierni. È disponibile la conferma manuale. Le conferme per un autore singolo si applicano anche agli altri suoi libri, come prima.

Il recupero usa la stessa identità degli autori di ricerca e pagine autore (alias e raggruppamento duplicati) invece di richiedere un unico nome identico nel catalogo grezzo. Sono eliminati i duplicati delle richieste per nomi normalizzati. Un caso senza evidenze sufficienti resta ignoto: per esempio due schede omonime non accorpabili non producono un paese automatico. Questo limita gli errori ma non garantisce copertura completa del catalogo.

Fonti delle proprietà: https://www.wikidata.org/wiki/Property:P27 e https://www.wikidata.org/wiki/Property:P297.

Verifica browser del componente reale con fixture temporanea: vecchia iscrizione Strega limitata al 2017 e lettura del 2020 → intero albo di 80 tappe e 1 completata; nessun selettore periodo. Fixture rimossa dopo il controllo. Test di migrazione in lettura, calcolo percentuale, date nelle sfide tematiche, omonimi, alias, cittadinanze multiple e stati storici.

## Percorso collegato e casi verificati

I premi a libri (Strega, Strega Europeo, Booker e International Booker) mostrano una rotaia orizzontale scorrevole con tappe collegate: copertina intera, anno, titolo, autore e stato. I dettagli aprono ricerca e associazione senza appesantire ogni card. Le copertine riusano il recupero progressivo esistente e sono caricate quando visibili. Il Nobel resta un percorso per autori, con spiegazione esplicita: una qualsiasi opera Letta completa l’autore, ulteriori suoi libri non aumentano il conteggio.

Le schede paese hanno bandiere decorative accanto al nome accessibile. Le letture valide sono separate dai libri Da leggere/In lettura; per un paese completato questi ultimi sono in un gruppo chiuso. Le letture fuori dai requisiti temporali restano in un ulteriore gruppo, senza completare il paese.

Per Haruki Murakami il catalogo contiene una scheda dominante nata il 12 gennaio 1949 (OL382524A) e una scheda omonima riportante il 1937. Si conserva la cautela generale sugli omonimi: un piccolo registro di collegamenti verificati associa il nome completo e i suoi alias noti a OL382524A / Wikidata Q134798. Il paese non è codificato nel registro: viene ancora letto da P27, che per quell’entità restituisce il Giappone (Q17, ISO JP). Il solo cognome Murakami non viene forzato a un’identità. Lo stesso collegamento è usato dalla selezione automatica nelle pagine autore.

Verifica: dati pubblici reali Open Library/Wikidata e risposta JP del resolver; browser con fixture locale contenente Norwegian Wood Letto, Kafka sulla spiaggia Da leggere e 1Q84 In lettura: una tappa JP completata, due libri raccolti separatamente. Percorso verificato a 1280px e 390px senza allargamento del dialogo, scorrimento con frecce e apertura dei dettagli. Fixture rimossa; nessun dato di account reale modificato.
