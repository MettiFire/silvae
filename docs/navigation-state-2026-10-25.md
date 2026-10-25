# Ripristino della schermata con Indietro

Il pulsante Indietro già usa la cronologia del router. Il difetto era nel ripristino delle pagine: i controlli basati su useState ripartivano dai valori iniziali a ogni montaggio, quindi la libreria tornava a Letti.

`useRememberedState` conserva soltanto valori primitivi dei controlli di visualizzazione. La chiave include account, percorso e identificatore reale della voce di cronologia (`__TSR_key`). Due visite diverse a /library mantengono quindi stati distinti, mentre Indietro e Avanti recuperano lo stato della visita esatta. I filtri non aggiungono nuove voci alla cronologia e non causano richieste di autenticazione o scritture sul database.

Si conservano:
- Libreria: scheda, ordinamento, ricerca, formato, genere, anno, preferiti, voto minimo, filtro di revisione, vista e numero di elementi caricati.
- Esplora: genere, anno, voto minimo e ordinamento.
- Profilo: scheda e numero di elementi visualizzati.
- Autore: scelta dell’autore, ordinamento, pagina e opzione per tutte le lingue.
- Frammenti: filtri, ricerca, ordinamento, cestino/preferiti e pagina.
- Statistiche: anno selezionato.
- Sfide: scheda, filtro, percorso aperto, tappe caricate e dettagli espansi. La bozza viene ricostruita dai dati attuali dell’account; modifiche non salvate ai moduli non vengono memorizzate.

La memoria è della singola scheda del browser: sessionStorage con fallback in memoria se lo spazio è bloccato o danneggiato, limitata a 80 voci. Non vengono conservati credenziali, testo dei moduli, citazioni o record della libreria. Lo scroll continua a essere gestito dal router, già configurato per ripristinarlo; il numero di elementi caricati viene conservato per mantenere l’altezza della lista.

Verifiche: 35 test mirati superati, inclusi sei casi nuovi per ripristino Da leggere, filtri/paginazione, visite distinte, isolamento degli account, dati corrotti, memoria limitata e il percorso Indietro/Avanti con createMemoryHistory della libreria reale del router. Controllo sintattico JSX/TypeScript e formattazione dei file modificati. La prova browser non è stata completata: i controlli CDP e nativi sono andati in timeout. Il controllo completo TypeScript è rimasto bloccato su dipendenze locali; non è dichiarato come superato.
