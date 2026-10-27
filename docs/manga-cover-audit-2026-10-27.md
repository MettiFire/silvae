# Manga volume cover audit — 2026-10-27

The production catalogue function was exercised directly against MangaDex with MyAnimeList identities and Italian as the preferred language. All numbered volumes were present in the ten standard series below (532 volumes in total). This checks catalogue coverage; it is not a guarantee of every publisher's edition or every future CDN response.

| Series | Numbered volume covers | Missing numbered volumes | Italian covers |
| --- | ---: | ---: | ---: |
| Berserk | 43 | 0 | 9 |
| Slam Dunk | 31 | 0 | 0 |
| Monster | 18 | 0 | 0 |
| Death Note | 12 | 0 | 0 |
| 20th Century Boys | 22 | 0 | 22 |
| Captain Tsubasa | 37 | 0 | 0 |
| One Piece | 115 | 0 | 0 |
| Naruto | 72 | 0 | 0 |
| Bleach | 74 | 0 | 0 |
| Detective Conan | 108 | 0 | 0 |

GET requests for sampled first/last cover images returned image/jpeg with HTTP 200. The CDN rejects HEAD requests with HTTP 405, so HEAD cannot be used to classify these images as missing. The checks used only public metadata and images; no account or personal library was accessed.

## Fixes

- Preserve alternate image files and thumbnail/original sizes for the same numbered volume. The image component tries these after load errors instead of immediately replacing the image with a number. The preferred language still comes first, then Japanese and English. Fractional volume labels are not reassigned to a different numbered volume.
- Normalize translated title aliases and use the canonical title to resolve MyAnimeList records to MangaDex. The MAL identity must match; a similarly named sequel is not accepted.
- Read subsequent catalogue pages with a 10,000-record safety bound instead of silently stopping at 400 records. A later page failure retains already retrieved covers.
- Cache only complete, nonempty retrievals. Empty and interrupted results remain retryable; incomplete client results become stale after one minute, complete results after one day.
- Display missing/unavailable cover messages with a retry button in both gallery and tracker.

Legacy personal numbering remains unchanged. When its volume count differs from the catalogue, standard-edition covers remain deliberately unassigned; the existing explanation is retained. An edition label alone no longer hides all covers when the saved and catalogue totals agree. When totals cannot be compared, a legacy edition label still prevents an uncertain mapping. For example, this audit finds 37 standard Captain Tsubasa volumes, which must not be blindly mapped to a personal edition with another count.

Regression tests cover pagination beyond 400 records, concurrent-request deduplication, partial-provider failure and recovery, alias lookup, empty-result recovery and same-volume image alternatives.

The real Berserk detail page was also checked in Codex's internal browser against the local application. The gallery displayed both volume ranges; decoded images were verified for the later range, including volume 43 after horizontal scrolling. Offscreen images remain lazy-loaded. The user's Chrome session was not used.

A follow-up check retrieved all 22 Italian covers for 20th Century Boys (MAL 3), with a sampled image returning HTTP 200 image/jpeg. The tracker was exercised in an isolated Codex browser fixture with this real catalogue response and a legacy edition label: covers render, the default view is read-only, Edit exposes progress controls, Cancel restores saved volumes, and Save returns to the read-only view. The previous-volume confirmation was also exercised. At 390px the document has no horizontal overflow; only the volume strip scrolls. The fixture used synthetic reading progress and did not write to a real account.
