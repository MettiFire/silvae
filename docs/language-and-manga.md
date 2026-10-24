# Site and catalogue languages

Settings → Language saves an Italian/English/automatic interface preference to `reading_preferences_v1.uiLanguage` and aligns the default book language. This form is independent of genre onboarding, uses the authenticated account identity and preserves genres/devices. Reading preferences still allow a separate catalogue language. Visitors can choose the interface language in the footer; only the language code is stored locally. Automatic follows the browser (Italian, otherwise English for the interface).

UI translations are bundled locally. UiText marks interface copy; UiElement translates accessibility labels, hints and placeholders without touching editable values, event handlers or metadata. Dates, navigation, settings and reading controls follow the interface language. Book titles, author names, profile names, quotes and user lists are data, not machine-translated UI. Legal documents remain in their original Italian. The document's `lang` follows the interface.

Search, discovery, bibliographies and book lookups use the catalogue language. Edition descriptions prefer the requested language, then fall back to available original content. Google records can locate an alternative-language edition through an exact ISBN/work match. Personal covers win; remembered public covers are partitioned by book language. Different translations still refer to the same library item and do not overwrite reading dates or progress. Availability is limited by the providers: no automatic invented translation or cover.

# Manga improvements

- MangaDex searches up to 32 candidates and displays up to 20 distinct series. Doujinshi and colored duplicates are filtered; known localized aliases cover common titles such as L’attacco dei giganti and I cavalieri dello zodiaco.
- Exact or broad MangaDex matches return directly. Sparse/failed searches use Jikan/MyAnimeList as fallback; manga/manhwa/manhua/one-shots are allowed, novels excluded. Deduplication prefers MangaDex when MAL IDs match. Existing `manga:md:` identifiers and saved progress are preserved; fallback `manga:mal:` series use the same tracker/storage.
- Cover art is loaded separately and cached for 24 hours. Per-volume selection prefers the chosen language, then Japanese, then English. Fractional/unknown volume numbers are excluded. A missing or broken image shows the number. We do not attach original-edition covers to differently numbered/omnibus editions.
- Volume pages render at most 48 controls at a time. Selecting a later unread volume opens a dialog offering only that volume, all preceding missing volumes, or cancel. Existing reads are retained; unmarking one does not erase later reads. Save confirms the draft using the existing account/storage checks.
- Publication status and final volume totals still control series completion. Volumes are never stored as pages or separate library books.

Metadata-only sources: https://api.mangadex.org/ and https://docs.api.jikan.moe/ . Provider queues pace requests; results are cached and in-flight duplicates share one request. We do not fetch chapters or reading files.

# Daily fragments

The earlier nine works were an initial verified collection, not a technical limit. There are now sixteen distinct public-domain works, including seven new excerpts verified against pinned Wikisource revisions. The fixed work rotation keeps fifteen other books between appearances. New works were inserted after the current Pinocchio slot and recent works kept later in the transition cycle.
