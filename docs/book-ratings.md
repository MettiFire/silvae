# Ratings

- Personal votes and individual reviews use LeafRating, 0–5 in half steps.
- Silvae community mean is numeric, with the number of readers, from the existing read-only aggregate.
- External reader ratings are numeric on their original 1–5 scale and labelled Google Books or Open Library. Missing scores are not zero. Work lookups retain these metadata fields through enrichment.
- Book Marks critical consensus is the percentage of Rave + Positive reviews divided by all reviews, rounded to the nearest integer. This is labelled as a Silvae calculation, not an official numeric Book Marks grade. The calculation is available in the UI and links to the original review page.

The server uses the ISBN index and complete HTML review list behind the officially documented Book Marks widget: https://bookmarks.reviews/what-is-the-widget/ . No external script or iframe executes in the client. At most three supported ISBNs per work are requested, with 4.5 second timeouts, deduplication and bounded responses/cache. The index is shared for 24 hours. Positive results cache 24 hours; absent results one hour. A score requires at least three reviews and the parsed list must exactly match the reported total; truncated flags or changed HTML never produce a numeric result. Missing ISBNs, unavailable providers or incomplete widgets omit the critic score. This catalogue primarily covers titles reviewed in English, not every Italian book.

# Daily fragments

The bundled emergency fallback rotation is anchored to 2026-10-24 (Europe/Rome calendar day). Newly verified works were inserted after the current Pinocchio slot and recently used titles were kept later in the transition cycle. Works rotate in catalogue order without reshuffling between cycles. Excerpts from the same normalized title and author share one work slot, alternating between cycles. With the current sixteen works, each book appears once every sixteen days, leaving fifteen other books between appearances. Keep catalogue order stable; deliberate catalogue/schedule changes should be reviewed against recent days. Tests cover 1,000 days, cycle boundaries, duplicates and invalid dates.

The normal homepage now uses the larger, language-specific static archive described in [daily-fragment-archive.md](daily-fragment-archive.md). The sixteen-work collection is retained only when that archive is unavailable.
