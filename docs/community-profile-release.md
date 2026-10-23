# Silvae — profili, book club e frammento del giorno

## Attivazione del database collegato a Lovable

Le migrazioni sono in entrambi i formati già usati dal progetto. Eseguire **un solo percorso**, non entrambi:

1. `drizzle/migrations/0006_profile_identity_and_images.sql`
2. `drizzle/migrations/0007_public_book_clubs.sql`

Gli equivalenti Supabase sono `20261023010000_profile_identity_and_images.sql` e `20261023020000_public_book_clubs.sql`.

Le migrazioni aggiungono il bucket pubblico `profile-images`, le policy di proprietà e le tabelle dei club. Non modificano la libreria o i frammenti privati. Gli username automatici derivati dall'email vengono sostituiti con identificativi neutrali; quelli scelti dall'utente sono conservati. I vecchi URL basati su username automatici cambiano insieme allo username. La migrazione invia anche il comando di aggiornamento della cache dello schema PostgREST.

Prompt utilizzabile nell'editor Lovable collegato al repository:

> Applica al database collegato le migrazioni Drizzle 0006_profile_identity_and_images e 0007_public_book_clubs, nell'ordine, senza reset dei dati e senza rieseguire migrazioni già applicate. Verifica la disponibilità delle quattro tabelle dei book club e del bucket profile-images con le relative policy. Il frontend è già implementato nel repository.

Il controllo live del 23 ottobre 2026 ha restituito PGRST205 per `book_clubs`: le migrazioni non erano ancora applicate. Questa sessione non dispone delle credenziali amministrative per eseguirle. Il push GitHub sincronizza il codice; non certifica l'applicazione delle migrazioni né la pubblicazione su Lovable.

## Funzionamento

- Tre pulsanti per la densità delle copertine, con preferenza persistente. In libreria sono accanto al pulsante elenco.
- Spaziatura della freccia per select native e icona non comprimibile per Select Radix.
- Email dell'account solo nell'intestazione privata e nelle impostazioni. Username, nome, bio, foto e banner sono pubblici e modificabili.
- Le immagini caricate vengono ricodificate nel browser, ridimensionate a 512 px per avatar e 1600 px per banner, quindi caricate nella cartella dell'utente con nome casuale. Non sono accettati SVG o file non immagine. Salva profilo applica le modifiche e rimuove le precedenti immagini caricate che non sono più usate. L’eliminazione dell’account rimuove le immagini pubbliche del proprietario prima della cancellazione del profilo.
- Club pubblici: creazione, iscrizione e uscita, dettaglio e link condivisibile, lettura del momento scelta dal catalogo, discussioni e risposte paginate. Solo i membri possono pubblicare. Creatore e autore possono rimuovere i contenuti secondo le policy; solo il creatore gestisce o elimina il club. I titoli delle discussioni con spoiler rimangono nascosti fino alla conferma.
- Il frammento del giorno usa otto brevi estratti iniziali di opere originali italiane di pubblico dominio, verificati su Wikisource. Giorno basato su Europe/Rome, selezione rimescolata senza ripetizioni adiacenti; stessa citazione su tutti i dispositivi. Fonte e licenza della trascrizione sono mostrate accanto all'estratto. Nessun frammento privato dell'utente viene pubblicato. Il catalogo viene interrogato solo quando si sceglie «Scopri questo libro»; le corrispondenze richiedono titolo e autore compatibili.

## Verifiche

- TypeScript, ESLint sui componenti modificati e build con audit dei segreti client.
- Test PostgreSQL locali tramite PGlite: migrazione identità, conservazione username scelti, proprietà immagini, iscrizione atomica del creatore, controllo membri, blocco della falsificazione dell'autore, moderazione e cancellazioni a cascata.
- Test del calendario del frammento, selezione stabile, rotazione completa e mancata ripetizione nei giorni adiacenti.
- Anteprima locale dei controlli griglia, citazione e select. Il caricamento effettivo sul bucket live e le operazioni reali sui club richiedono prima l'attivazione delle migrazioni.

## Controllo dopo l'attivazione

Con due account di prova: scegliere username/bio, caricare avatar e banner, verificare il profilo dall'altro account; creare un club, iscriversi dal secondo account, pubblicare una discussione con spoiler e rispondere; verificare che un non membro non possa pubblicare, che solo il creatore cambi il libro e che l'uscita dal club revochi la possibilità di scrivere. Non usare account o dati reali per prove di cancellazione.
