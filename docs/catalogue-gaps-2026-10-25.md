# Ricerca e catalogo integrativo — 25 ottobre 2026

La ricerca precedente completava esclusivamente il campo titolo e scartava una query come `Cyril Pedrosa - Portugal`. Ora i termini possono appartenere a titolo e autore; la sintassi inviata al catalogo è costruita da parole normalizzate, senza accettare operatori Solr dell'utente. La deduplicazione delle edizioni rimane attiva.

## Verifiche dei cataloghi

Open Library, controllato via API:
- `Portugal Cyril Pedrosa`: due record dell'opera, tra cui `OL19738516W`.
- Autore Cyril Pedrosa: record `OL3144540A` e `OL7534188A`; la bibliografia in italiano non indicizza correttamente l'edizione ISBN `9788865430828`.
- `Il Trono del Muori`: zero risultati sia nella ricerca autori sia nella ricerca libri.

Il catalogo integrativo contiene solo tre schede verificate, non risultati generati: Portugal e le due opere del Trono del Muori elencate sotto. Riusa l'identificativo dell'opera Open Library per Portugal e i veri identificativi Google Books per gli altri due titoli. Google Dynamic Links ha restituito questi identificativi e le rispettive copertine da ricerche ISBN:

| ISBN | Opera | Google Books |
|---|---|---|
| 9788865430828 | Portugal | hLuMtgAACAAJ |
| 9788804788591 | Gli eroi del Muori | RHvx0AEACAAJ |
| 9788804808626 | La Muorissea | TYTe0QEACAAJ |

Fonti bibliografiche:
- [Portugal, IBS](https://www.ibs.it/portugal-libro-cyril-pedrosa/e/9788865430828): autore, edizione italiana BAO, ISBN e 264 pagine. L'anno 2011 è quello dell'opera originale; l'edizione italiana è del 2012.
- [Catalogo Rizzoli/Mondadori: Il Trono del Muori](https://www.libreriarizzoli.it/autore/il-trono-del-muori/c/05773817): bibliografia.
- [Libraccio: bibliografia e ISBN](https://www.libraccio.it/autore/il-trono-del-muori/libri.html): Gli eroi del Muori, 2024, e La Muorissea, 2026.
- [Biblioteca Braidense, record PCM0056115](https://opac.bibliotecabraidense.org/opac_braidense/opaclib?db=solr_braidense&do_cmd=search_show_cmd&fname=none&format=unimarc&from=168&nentries=1&refine=54%21%3A%21ita%21%3A%21italiano%21%3A%21Lingua%4058%21%3A%21milano%21%3A%21milano%21%3A%21Luogo+di+pubblicazione%404018%21%3A%21mondadori%21%3A%21mondadori%21%3A%21Editore&resultForward=opac%2Fbraidense%2Ffull_simili.jsp&rpnlabel=Ultimi+arrivi&rpnquery=%40attrset+bib-1++%40and+%40attr+2%3D4++%40attr+4%3D4+%40attr+1%3D90038+%2220240617+%22+%40attr+1%3D31+%40attr+2%3D4++%40attr+4%3D4+%222020%22&searchForm=opac%2Fbraidense%2Ferror.jsp&select_db=solr_braidense&simili_id=PCM0056115&sortlabel=Data_discendente&sortquery=+DESC++BY+%40attrset+bib-1++%40attr+1%3D31++BY+%40attrset+bib-1++%40attr+1%3D3086++BY+%40attrset+bib-1++%40attr+1%3D6003&totalResult=1400): autore, varianti Cesyro/Cesiro e illustratrice Veronica Ciancarini. Le pagine indicate dal record sono 191; il catalogo integrativo non inventa una consistenza quando i cataloghi divergono.

Le descrizioni nel catalogo integrativo sono brevi sintesi originali dei dati bibliografici. Non vengono copiati recensioni, voti o citazioni da Goodreads.
