# Copertine, immagini profilo e letture affini

## Comportamento

- Il frammento del giorno usa una copia decorativa sfocata della copertina realmente caricata per creare lo sfondo, con un velo del tema per mantenere leggibile il testo. Non usa servizi di analisi delle immagini e non richiede CORS sulle copertine.
- La copertina risolta è condivisa nella cache di presentazione durante la navigazione. Le sole URL pubbliche di Google Books/Open Library vengono ricordate per sette giorni, fino a 100 libri, anche per riaperture e nuove schede. Le immagini personali hanno precedenza; le URL di upload privati o firmati non vengono salvate in questa memoria locale.
- I metadati di un'opera Open Library non attendono più ulteriori ricerche Google delle copertine: la presentazione e i dati bibliografici sono separati.
- Il selettore include la copertina effettiva corrente e le alternative delle edizioni; un cambio personale aggiorna subito la cache di presentazione e la libreria.
- In fondo alla scheda ci sono fino a sei titoli affini, con il motivo del suggerimento. Si usano autore e generi specifici, con diversificazione degli autori. La sola categoria generica Fiction/Nonfiction non genera una selezione casuale di bestseller.
- Le ricerche dei libri simili partono in prossimità della sezione (400 px), utilizzano al massimo tre fonti e sono conservate per 30 minuti. La sezione esclude libro aperto, opere già in libreria e generi evitati. La normalizzazione riconosce anche duplicati del catalogo con un articolo iniziale diverso (es. Decameron/The Decameron) o l’attribuzione dell’autore aggiunta in coda al titolo, senza unire autori diversi.

## Foto e banner

1. JPG, PNG e WebP non vuoti, fino a 8 MB in ingresso.
2. Decodifica effettiva e limite di 40 megapixel; ridimensionamento a 512 px per foto e 1600 px per banner, senza ingrandire gli originali.
3. Ricodifica WebP (o formato supportato restituito dal browser), con tentativi di riduzione per rispettare il limite Storage di 2 MB. La ricodifica rimuove i metadati incorporati.
4. Verifica dell'account prima dell'upload nella propria cartella, nome casuale e nessuna sovrascrittura.
5. Verifica del caricamento dell'immagine pubblica prima di passare l'URL al form. Una sessione cambiata o una verifica fallita non sostituisce il campo; il nuovo file viene rimosso per quanto possibile.
6. Le immagini si applicano con Salva profilo pubblico. Uno username automatico non obbliga a sceglierne uno nuovo per salvare solamente le immagini. La sostituzione applicata elimina le vecchie immagini possedute.

## Verifiche (23 ottobre 2026)

- 157 test automatici superati; TypeScript, lint mirato, build e audit dei segreti client superati.
- Test automatici: conversione e limiti, avatar/banner, errori Storage, sessione cambiata, verifica anteprima e pulizia dopo fallimento, priorità delle copertine e cache pubblica, pertinenza e duplicati dei consigli.
- Test database PGlite: upload nella propria cartella, lettura pubblica, salvataggio avatar/banner sul proprio profilo, impossibilità di modificare le immagini del profilo altrui.
- Browser reale, JPEG di prova generato localmente: avatar 512×256, WebP circa 68 KB; banner 1600×800, WebP circa 743 KB. Entrambe le anteprime sono state decodificate e verificate. La pagina di prova temporanea non è inclusa nell'app.
- Controllo pubblico in sola lettura: il bucket live `profile-images` esiste (risposta Object not found a un nome volutamente inesistente).
- Nessun nuovo upload sul servizio live e nessuna foto dell'utente modificata: manca una sessione Silvae autenticata per una prova reale sul suo account. I test locali/di database non certificano le autorizzazioni attualmente applicate dal servizio remoto.
