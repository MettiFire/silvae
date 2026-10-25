# Frammenti, alfabeto, ricerca e rimozione — 25 ottobre 2026

## Frammento del giorno

“Mostra meno di questo autore” salva una preferenza privata, separata dalle lingue e dai gusti di lettura. Per gli account si aggiorna solo il relativo campo metadata, rileggendo lo stato e verificando l'identità prima di scrivere; per gli ospiti si usa una memoria locale del browser. Il frammento viene sostituito subito quando esistono alternative.

L'autore ridotto resta ammissibile in circa un giorno su cinque, mai nello stesso giorno del feedback. Non è un blocco definitivo. Se tutto l'archivio disponibile è composto da autori ridotti, si conserva un frammento anziché lasciare la home vuota. La scelta è deterministica nella giornata e rispetta le lingue selezionate. Il messaggio offre Annulla; in Impostazioni → Lingua si può ripristinare ciascun autore anche in seguito.

## Ricerca

La ricerca ora combina parole del titolo e del nome autore: `Cyril Pedrosa - Portugal` può trovare Portugal. Continuano a essere raggruppate le edizioni della stessa opera. I termini non vengono eseguiti come sintassi Solr.

Per i tre record verificati assenti o incompleti nei cataloghi si usa un catalogo integrativo con ISBN e identificatori reali: [fonti e dettagli](./catalogue-gaps-2026-10-25.md). Le schede compaiono immediatamente nell'autocomplete mentre prosegue il recupero remoto. Il Trono del Muori ha una pagina autore seguibile, con le due opere verificate; non gli viene attribuita una popolarità Open Library inesistente.

## L’alfabeto delle storie

Sfida tematica con 26 tappe, A–Z, iscrizione e percentuale di completamento. Conta automaticamente i titoli dei libri/graphic novel segnati Letto nella libreria. Si usa la prima lettera alfabetica, articoli inclusi; accenti e punteggiatura vengono ignorati. Le date rispettano le normali opzioni della sfida: letture precedenti incluse di default, data valida necessaria quando si sceglie un periodo. Una stessa opera non completa più tappe attraverso copie identiche. Le letture non completate possono comparire come proposte, ma non aumentano il punteggio.

La scheda interna usa una griglia di lettere con copertina e titolo della lettura associata automaticamente; tutte le 26 tappe sono visibili senza caricamento di ulteriori anni o associazioni manuali arbitrarie.

## Rimozione dalla libreria

Comando visibile nella scheda libro e nella libreria, sia in griglia sia in elenco. Il dialogo spiega quali dati della voce verranno rimossi e permette di annullare. La cancellazione usa la mutazione già presente: verifica dell'utente e filtro contemporaneo su ID della voce e proprietario. Successi ed errori vengono mostrati; durante la richiesta si impediscono invii duplicati. Libreria, singolo elemento e valutazione aggregata vengono invalidati dopo il successo.

La rimozione cancella stato, date, voto e avanzamento della voce: aggiungere di nuovo il libro non ripristina questi dati. Non è stata eseguita una cancellazione su un account reale durante il collaudo.

## Verifiche

Test automatici su completamento titolo/autore e deduplicazione, identificatori/ISBN, autore integrativo e bibliografia, titoli accentati e avanzamento A–Z, filtri temporali, feedback reversibile e limiti, aggiornamenti account e verifica dell'identità. Prove nel browser su ricerca Portugal, risultati e pagina del Trono del Muori, sostituzione del frammento come ospite, apertura della sfida e apertura/annullamento del dialogo di rimozione con dati sintetici locali. La schermata temporanea di collaudo è stata rimossa.

Build, controllo TypeScript, lint dei file modificati e audit dei segreti client. Non sono necessarie nuove tabelle o migrazioni.
