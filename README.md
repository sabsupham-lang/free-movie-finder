# Free Movie Finder

A mobile-first website for finding films you can watch legally for free. It has two parts:

1. **A public-domain library.** About 2,400 films that Wikidata records as public domain in the United States. Each one has a verified, playable copy on the Internet Archive or Wikimedia Commons, and plays right on the film page.
2. **A legal-availability directory.** For any film on TMDB, it shows where you can stream it in your country: free, free with ads, library apps (Kanopy, Hoopla), subscription, rent or buy. Data comes from JustWatch via TMDB.

The site hosts no video and never links to unauthorized copies.

It works out of the box in **demo mode**, which shows only the public-domain library. Add a free TMDB token to unlock the full catalog (popular, trending, search across all films, cast, trailers and regional availability).

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. That's demo mode. For the full catalog:

```bash
cp .env.example .env.local
```

Then set `TMDB_READ_TOKEN` in `.env.local` (see [Getting a TMDB token](#getting-a-tmdb-token)) and restart `npm run dev`.

## Features

- Search by title, or by actor or director
- Filters: free to watch in your country, streaming service, genre, original language, release years, runtime, minimum rating, and sort
- Categories: free to watch, public domain, popular, trending, highly rated, recent, classics, family, documentaries
- Film pages: poster, synopsis, cast, director, year, runtime, genres, rating (with its source), official trailer, and every legal way to watch, grouped by cost
- Public-domain films play on the page (Internet Archive player or Wikimedia Commons video)
- Watchlist and favorites saved in the browser. No account needed.
- Infinite scroll with a real "Load more" button for keyboard and screen-reader users
- Country picker (47 countries), light and dark themes, bottom tab bar on phones
- Works without JavaScript for browsing, searching and filtering (plain links and GET forms)

## Tech stack and why

| Choice | Why |
| --- | --- |
| **Next.js 16 (App Router) + React 19 + TypeScript** | Server components keep the TMDB token on the server, render pages fast on phones, and cache API responses. One codebase for pages and the small JSON API. |
| **Plain CSS with custom properties** | No CSS framework to learn or ship. Light and dark palettes are a few variables. |
| **TMDB API** (free) | The largest free movie metadata API, and it carries JustWatch streaming data per country, including "free" and "ads" offers. |
| **Wikidata + Internet Archive + Wikimedia Commons** (free, no keys) | Open data for public-domain status, credits, and playable copies. |
| **JSON file as the catalog database** | About 2,400 films fit in 2.5 MB. No database server, nothing to pay for or back up. Rebuilt weekly by a script. |
| **localStorage for lists** | No accounts, no personal data on a server. |
| **Vitest** | Fast unit tests for the parts that decide what users see. |
| **Vercel or Netlify free tier + GitHub Actions** | Free hosting and a free weekly data refresh. |

## Project structure

```
free-movie-finder/
  data/public-domain.json        Public-domain catalog (generated, committed)
  scripts/
    refresh-public-domain.mjs    Rebuilds the catalog from Wikidata, Archive, Commons
    validate-catalog.mjs         Schema check for the catalog
    catalog-utils.mjs            Genre mapping and text cleanup (tested)
  src/
    app/                         Pages and API routes (Next.js App Router)
      page.tsx                   Home: search plus a row per category
      browse/[category]/         Category grid with filters and infinite scroll
      search/                    Title or person search with filters
      movie/[id]/                Film page: details, player, trailer, where to watch
      lists/                     Watchlist and favorites (client side)
      settings/                  Country and theme
      about/ privacy/ terms/     Notices, data sources, legal pages
      api/movies/                Paged JSON for infinite scroll
      api/revalidate/            Clears cached TMDB data (secret protected)
      api/health/                Mode and catalog age, for monitoring
    components/                  UI pieces (cards, grid, filters, players, icons)
    lib/
      catalog.ts                 Single entry point: picks TMDB or local data, merges both
      tmdb.ts                    Server-only TMDB client and mappers
      publicDomain.ts            Queries over the local catalog
      filters.ts                 Validates query-string filters
      storage.ts                 Watchlist and favorites in localStorage
  tests/                         Vitest unit tests
  docs/                          Architecture, data, deployment, testing
  .github/workflows/             Weekly catalog refresh
```

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATA.md](docs/DATA.md), [docs/DEPLOY.md](docs/DEPLOY.md), [docs/TESTING.md](docs/TESTING.md).

## Environment variables

All are optional. Copy `.env.example` to `.env.local` for local work, and set them in your host's dashboard for production.

| Variable | Used for | Default |
| --- | --- | --- |
| `TMDB_READ_TOKEN` | Full catalog, trailers, cast, regional availability. Server only, never sent to browsers. | unset (demo mode) |
| `DEFAULT_REGION` | Country for availability until a visitor picks one. Two-letter code. | `US` |
| `REVALIDATE_SECRET` | Protects `POST /api/revalidate`. The endpoint is off when unset. | unset |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL in metadata. | `http://localhost:3000` |
| `CATALOG_CONTACT` | Contact URL or email in the refresh script's User-Agent, as Wikidata asks. | placeholder |
| `SITE_OPERATOR_NAME` | Who runs the site, shown on the Privacy and Terms pages. | unset (shows a placeholder) |
| `SITE_CONTACT_EMAIL` | Contact and takedown email on the Privacy and Terms pages. | unset (shows a placeholder) |
| `SITE_HOSTING_PROVIDER` | Named in the Privacy policy, for example `Vercel Inc.` | unset (shows a placeholder) |
| `SITE_GOVERNING_LAW` | Governing law line in the Terms. | unset (shows a placeholder) |
| `SITE_LEGAL_EFFECTIVE_DATE` | Effective date of both pages, as `YYYY-MM-DD`. | unset (shows a placeholder) |

## Getting a TMDB token

1. Create a free account at https://www.themoviedb.org/signup.
2. Go to **Settings > API** (https://www.themoviedb.org/settings/api) and request an API key. Choose the developer option and describe the project.
3. Copy the **API Read Access Token** (the long one). Put it in `TMDB_READ_TOKEN`.

Terms to know:
- TMDB's API is free for non-commercial use. If you plan to make money from the site, read TMDB's API terms and contact them about a commercial license.
- You must show the TMDB attribution. The footer and About page include the required notice, and the footer shows the official TMDB logo (approved versions: https://www.themoviedb.org/about/logos-attribution).
- Streaming data comes from JustWatch. Keep the "JustWatch" credit shown next to availability.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Unit tests |
| `npm run lint` | TypeScript type check |
| `npm run refresh:catalog` | Rebuild `data/public-domain.json` (takes 10 to 20 minutes) |
| `npm run validate:catalog` | Check the catalog file against its schema |

## Deployment

Short version for Vercel (free Hobby plan, which Vercel limits to non-commercial use):

1. Push this folder to a GitHub repository.
2. Import it at https://vercel.com/new. No build settings to change.
3. Add `TMDB_READ_TOKEN`, `DEFAULT_REGION`, `REVALIDATE_SECRET` and the `SITE_*` owner details under Settings > Environment Variables. Redeploy.
4. Connect your own domain under Settings > Domains.
5. In GitHub, add `SITE_URL` (Settings > Variables) and `REVALIDATE_SECRET` (Settings > Secrets) so the weekly refresh can clear the live cache.

Netlify works too. See [docs/DEPLOY.md](docs/DEPLOY.md).

## Limitations, stated plainly

- **"Free" is per country.** JustWatch covers about 47 countries. Elsewhere, availability shows as "none listed", not "unavailable".
- **Public domain means US public domain**, as recorded on Wikidata. Wikidata can be wrong, and rules differ in other countries. Each film page says so.
- **No deep links to services.** TMDB does not provide them. The film page links to TMDB's listing page, which links out to each service.
- **Title search can't filter by service or free status.** TMDB's search endpoint doesn't support it, and checking each result separately would burn through rate limits. Searching by person and browsing support every filter. The page says so when this applies.
- **Some playable copies are imperfect.** Archive uploads vary in quality, and a few may be cut versions. When both sources exist, the player offers both.
- **Public-domain ratings** come from Internet Archive user reviews and only show with 3 or more reviews. TMDB ratings replace them when a token is set.

## Before launch

Status of the launch checklist for this codebase:

- [ ] **Custom domain connected.** Not done; needs your domain.
- [x] **Favicon set.** `src/app/icon.svg`.
- [x] **No "Made with AI" or builder badge.** None in the code.
- [ ] **Privacy policy page exists and is linked.** The page exists and is linked in the footer. Set `SITE_OPERATOR_NAME`, `SITE_CONTACT_EMAIL`, `SITE_HOSTING_PROVIDER` and `SITE_LEGAL_EFFECTIVE_DATE`; the "Draft" notice disappears once all are set.
- [ ] **Terms page exists and is linked.** Same, using `SITE_OPERATOR_NAME`, `SITE_CONTACT_EMAIL`, `SITE_GOVERNING_LAW` and `SITE_LEGAL_EFFECTIVE_DATE`.
- [x] TMDB logo added to the footer (their attribution rules). It loads the official SVG from themoviedb.org; to self-host, save it as `public/tmdb-logo.svg` and change `TMDB_LOGO_URL` in `src/app/layout.tsx` to `/tmdb-logo.svg`.

Until the unchecked items are done, the site is not launch ready.

## Ideas for later

See the end of [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#future-improvements).
