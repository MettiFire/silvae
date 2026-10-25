# Daily literary fragments

The home page uses Silvae's static, versioned archive of sourced Wikiquote excerpts.
The initial import contains 1,231 excerpts from 490 distinct works: 181 excerpts / 98 works
in Italian, and 1,050 excerpts / 392 works in English. Works include novels, collections,
essays and plays; these numbers must not be described as thousands of individual books.

## Import and provenance

Run `npm run import:fragments`. `--refresh` downloads new source revisions; otherwise
snapshots in `../work/fragment-import` make repeated imports reproducible and avoid
unnecessary requests to Wikimedia. `--it-only` refreshes just Italian, preserving the
other language manifest. No import runs during build or on a reader's page request.

`scripts/fragments/sources.json` is an explicit allowlist of authors writing original
texts in the indicated language. The importer checks the death year against the source
lead and uses a conservative rolling cutoff; it skips modern authors, uncertain source
pages and translations rather than assuming a repository license clears every quotation.
Adding a new author requires checking the original language and rights of the actual work
and edition. The date check is an initial screening, not a universal copyright assessment.

The parser accepts book/work headings or explicit Italian `Da ''opera''` references,
excludes unsourced/about-author sections and their descendants, and rejects unsupported
markup instead of guessing its meaning. It strips wiki markup and citation/page labels,
not rewrites the author's wording. Excerpts are short, complete passages with a maximum
of 65 words; at most three different excerpts per work are published. Ambiguous headings,
generic letters/speeches, markup artifacts and incomplete excerpts are filtered out.
Editorial quality is still limited by the underlying Wikiquote transcription/attribution.
The import report records processed pages, pinned revision IDs, source dates and skips.
A major unexpected loss of works aborts the manifest update.

Every excerpt retains author, work, language, exact source revision, source provider,
section and attribution/license metadata. The work title links to the source, with the
CC BY-SA version in its tooltip; accessible source and license links remain in the card.
The separate “Explore this book” link opens the catalogue entry only after title AND
author match. We never assign a book on the strength of the author's name alone.

## Selection and runtime

The archive is loaded after hydration, one interface language at a time. Its JSON lives
outside the JavaScript bundle. Hashed JSON files receive long immutable cache headers;
the small manifest is refreshed separately. The existing bundled Italian collection
remains available if archive loading fails. No private highlights are published.

The daily selection is deterministic for the Rome calendar date and language. It groups
all excerpts of a work into one slot, pseudo-randomizes the work order, interleaves authors,
and changes excerpts on later cycles. An author with more quotes does not get more slots
for the same work. Distinct works by that author still count separately. When author
counts are uneven, an equal minimum author gap cannot be guaranteed.

At a fixed archive version, a work cannot repeat before the entire language-specific
work pool has cycled: currently 98 days for Italian and 392 for English. A 180-day window
requires at least 180 distinct works in that language; the implementation does not invent
new titles to claim this guarantee. Publishing a changed corpus changes the permutation,
so the guarantee does not extend across archive replacements. A persisted publication
calendar would be the next step if imports become frequent.

The preferred catalogue language continues to guide cover/metadata lookup independently.
Quotations are not machine-translated or attributed to an unverified translated edition.
Modern licensed quotations can later enter a separately reviewed import path; Goodreads
scraping and generic author-only JSON collections are not part of this importer.

## Checks

Tests cover Rome date behavior, 900-day work-repeat spacing, duplicate excerpts, author
interleaving, unsafe manifests, unavailable/invalid archives, sourced parsing, excluded
commentary, and integrity of every published archive entry. Review the real source pages
when changing parsing rules or admitting new authors; passing schema checks is not an
editorial review of every quotation.
