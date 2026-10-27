# 🌿 Silvae 

**Keep track of every story.**

Silvae is a personal and social reading tracker for organizing your library,
discovering books, saving favorite passages, and sharing reading journeys.
It supports books, graphic novels, and manga series through an editorial interface
with light and dark themes.

Live: https://silvae.lovable.app

Hosted on Lovable because it's free and easy to use.

[Open Silvae](https://silvae.lovable.app) · [Report an issue](https://github.com/MettiFire/silvae/issues)

## 📚 Features 

- **Your library:** organize books as to read, currently reading, read, or abandoned.
  Track dates, progress, rereads, favorites, reviews, and personal leaf ratings.
- **Search and discovery:** find books, manga, and authors; explore author
  bibliographies and follow your favorites. Recommendations combine your reading
  preferences with your library, excluding recognizable editions and translations
  of works you already own.
- **Manga series:** keep one library entry per series and track individual volumes,
  with confirmation before marking earlier volumes as read. Graphic novels from
  the book catalogue remain separate entries and do not yet support series tracking.
- **Reading challenges:** set an annual goal or explore literary prize winners,
  Nobel laureates, countries, genres, your backlog, and the alphabet. Progress is
  calculated from your library; challenges with a date range require valid reading dates.
- **Fragments:** collect personal quotes, organize them with tags and favorites,
  and import highlights. The home page also features a daily literary passage from
  a sourced archive, with language preferences and author feedback.
- **Community:** customize your profile, follow readers, create public or private
  lists, and join public book clubs. Your account email stays private.
- **Reading history:** explore yearly statistics, a calendar, filters, and different
  grid sizes. Back navigation preserves tabs and filters.

The interface supports Italian, English, and automatic language selection.
Settings also let you choose a book language and multiple languages for daily fragments.
Titles, covers, descriptions, and work matching depend on external catalogues;
coverage and matching across editions are not guaranteed for every book.

## 🧱 Tech stack 

- React 19, TypeScript, TanStack Start / Router / Query, and Vite.
- Tailwind CSS, Radix UI components, and Recharts.
- Supabase / Lovable Cloud for authentication, database, and storage, with RLS policies.
- Open Library and Google Books for books; AniList, MangaDex, and Jikan/MyAnimeList
  for manga search and metadata.

Catalogues provide metadata and images. Silvae does not distribute ebooks or manga
chapters. Personal ratings, community averages, and external ratings are displayed
as separate information.

## Getting started

Use **Node.js 24 or later** to run the TypeScript tests with Node’s native type
stripping. The optional reader prototypes also require Python 3.10+.

```sh
git clone https://github.com/MettiFire/silvae.git
cd silvae
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project’s public configuration:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_with_your_public_key
VITE_SUPABASE_PROJECT_ID=your-project
```

Then start the development server:

```sh
npm run dev
```

Variables prefixed with `VITE_` are visible in the browser. Never use them for
passwords, `service_role` keys, private keys, or third-party service secrets.

For an independent backend, apply the migrations in
[`supabase/migrations`](supabase/migrations) in filename order and configure
authentication origins and callback URLs. Google sign-in, email confirmation,
and password recovery also require their respective provider settings;
copying the frontend alone does not enable them.

## 🛠️ Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Validate public environment variables, build, and scan the client bundle for secrets. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint. |
| `npx tsc --noEmit` | Check TypeScript types. |
| `node --experimental-strip-types --test tests/*.test.mjs` | Run the Node suite, including local database tests with PGlite. |
| `npm run audit:client` | Repeat the secret scan on an existing client build. |
| `npm run import:fragments` | Refresh the literary archive using the importer’s sources and rules. |

The reader connectors have separate Python tests:

```sh
python3 tests/kobo-export.test.py
python3 tests/reader-bridge.test.py
python3 tests/kindle-cloud-probe.test.py
```

## Importing books and highlights

The book importer accepts generic CSV files, Goodreads and Bookshelf exports,
including original Bookshelf ZIP files. It provides a preview, column mapping,
date and rating validation, duplicate handling, and per-row errors.
Files are limited to 10 MB and 5,000 rows; ZIP files also have a limit on extracted
CSV data. See [`public/import-template.csv`](public/import-template.csv) for an example.

The separate Fragments importer supports Kindle My Clippings, CSV, Bookshelf Cards,
and selected text/HTML exports. It suggests book associations and leaves uncertain
matches available for review in the preview. Importing highlights does not
automatically change reading status or dates.

## Ebook reader integrations

Connections are managed in **Settings → Devices**. The repository includes a local
USB bridge, an experimental KOReader integration, and export tools.
**Native automatic Wi-Fi synchronization with Kindle or Kobo accounts is not available.**
An experimental Amazon device-code connection is available in Settings → Devices.
It stores device credentials encrypted on the server; reading progress retrieval
is still being validated and does not update the app’s library.

Requirements, limitations, and instructions are documented in
[`docs/reader-integrations.md`](docs/reader-integrations.md) (Italian).

## Deployment and private data

The project is connected to Lovable: commits pushed to `main` synchronize with the
editor. Updating the public site requires **Publish → Publish changes**.
Pushing code does not automatically apply database migrations or confirm Edge
Function deployment.

- Store server secrets in your hosting environment configuration.
- Never commit Amazon sessions, cookies, personal reader configurations,
  Kobo databases, or users’ library exports.
- `.gitignore` excludes local environments and device session/configuration files.
  The already tracked `.env` contains only public Supabase configuration;
  ignore rules do not remove previously tracked files.
- Privacy and Terms pages are linked in the footer. For your own deployment,
  update the contact in `src/lib/legal.ts` and the domain in `src/lib/site-seo.ts`,
  `public/sitemap.xml`, and `public/robots.txt`.
- Do not rewrite published Git history: the Lovable integration relies on it.

## 📄 Documentation

The documentation includes English and Italian implementation notes:

- [Daily fragment archive and sources](docs/daily-fragment-archive.md)
- [Personal, community, and external ratings](docs/book-ratings.md)
- [Manga series and volume tracking](docs/manga-series.md)
- [Interface and catalogue languages](docs/language-and-manga.md)
- [Challenges, awards, and book origins](docs/challenge-archives-and-origins.md)
- [Profiles and book clubs](docs/community-profile-release.md)
- [Publication privacy check](docs/publication-readiness-2026-10-25.md)

Some documents describe changes and checks at a specific date. They do not guarantee
external service availability or reflect the current production deployment.
