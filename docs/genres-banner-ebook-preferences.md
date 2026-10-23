# Filtri, banner e lettori ebook

La libreria e Discovery usano nove gruppi di generi condivisi. La libreria mostra solo quelli presenti, più «Altri / non classificati» per i metadati sconosciuti o assenti; un libro può appartenere a più gruppi. Le categorie originali dei cataloghi non vengono modificate. Le ricerche Discovery includono i soggetti del gruppo con OR.

La decorazione P / del banner è limitata a `.profile-banner:not(.has-image)`, comprese le regole responsive. La foto personalizzata non la mostra.

Le preferenze private `reading_preferences_v1.ebookDevices` contengono i tipi kindle/kobo/other. Campo assente: domanda non ancora risposta, mantiene i controlli degli account esistenti. Array vuoto: risposta No, nasconde il modulo percentuale ebook nelle schede e usa le pagine nella barra di progresso. Uno o più tipi: mantiene i controlli ebook. Nessun dato di avanzamento viene cancellato. Il tipo di lettore non attiva collegamenti automatici.

La domanda è nell'onboarding e in Impostazioni → Dispositivi; la risposta può essere salvata anche scegliendo i gusti più tardi. I gusti esistenti sono mantenuti quando si modificano i dispositivi. Non occorrono migrazioni del database.

Verifica: 168 test, TypeScript, build e audit bundle. Controllo browser dei componenti reali con fixture temporanea: banner base e personalizzato; risposta No anche saltando i gusti; Kobo senza Kindle. Fixture rimossa dopo il controllo. Nessuna modifica ad account reali durante la prova.
