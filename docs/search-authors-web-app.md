# Ricerca, identità degli autori e web app

La ricerca autori richiede una corrispondenza effettiva tra i termini e il nome o un alias del catalogo. Non ripiega su autori generici quando il testo è il titolo di un libro. I risultati sono raggruppati usando alias, date biografiche e opera principale; date incompatibili mantengono persone distinte. Record duplicati poco documentati sono accorpati al record principale. Gli identificativi accorpati sono considerati anche nella bibliografia e nel pulsante Segui.

La bibliografia usa le edizioni nella lingua delle preferenze (inizialmente quella del browser). Il lettore può includere anche le opere senza edizioni in quella lingua. I nomi usano alias realmente presenti nel catalogo. Per opere con titolo originale in un altro alfabeto, Wikidata fornisce, se disponibile, il titolo localizzato tramite corrispondenza esatta P648/Open Library: una richiesta per pagina, timeout 3,5 secondi, cache limitata a 1.000 identificativi per 24 ore. In caso di assenza o errore resta il titolo dell'edizione. Il catalogo esterno può comunque avere dati incompleti o associazioni errate.

Il menu di ricerca ha scorrimento verticale e gestione Frecce/Home/End. L'altezza tiene conto del viewport, della tastiera virtuale e della navigazione mobile.

Silvae include manifest, icone PNG 192/512, variante maskable, Apple touch icon e favicon ricavate dall'albero esistente. Il service worker viene registrato solo in produzione. Conserva esclusivamente icone e schermata offline statica; non memorizza pagine private, librerie, risposte API o autenticazione. Il contenuto richiede connessione. Su HTTPS, dopo Publish, è installabile con il comando del browser o Aggiungi alla schermata Home su iOS. L'installazione sul dispositivo non è stata eseguita automaticamente.

Verifica: suite Node, TypeScript, build e audit dei segreti del bundle; controllo browser della ricerca per autore/titolo e del menu a 390 × 500, con ultimo risultato sopra la barra mobile. Test manifest e comportamento cache del service worker. Verifica pubblica di Wikidata per OL166894W → Delitto e castigo, OL10432709W → I fratelli Karamazov, OL166952W → Le notti bianche.
