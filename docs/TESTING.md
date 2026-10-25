# Testing and accessibility checklist

## Automated

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run validate:catalog
```

```bash
npm run build
```

Unit tests cover: filter validation and URL round-trips, every local category rule and filter, TMDB parameter mapping (free-only, providers, vote floors), availability grouping and library notes, trailer selection, rating thresholds, Wikidata genre mapping, description cleanup, and rejection of tampered localStorage.

## Manual test pass

Run in demo mode first (no token), then with `TMDB_READ_TOKEN` set.

**Phone (375px wide) and desktop**
- [ ] Home shows the demo notice when no token is set, and rows of films
- [ ] Bottom tab bar on phones, top navigation from 900px up
- [ ] Browse a category, scroll to the end: more films load; "Load more" works by keyboard
- [ ] Filters: free only, genre, language, years, runtime, rating, sort, services. The URL updates and can be shared
- [ ] "Clear all" removes filters
- [ ] Title search and "Actor or director" search both return results
- [ ] Film page: poster, facts, genres, rating with source, director link, synopsis with source
- [ ] Public-domain film: press "Watch ... free" and the film plays; the second source button switches players
- [ ] TMDB film: trailer plays only after pressing it; offers grouped by Free, Free with ads, Subscription, Rent, Buy
- [ ] Change country in Settings: header code changes and offers change
- [ ] A country with no offers shows "No ... offers are listed for ..." and not "unavailable"
- [ ] Add to watchlist and favorites, reload, still there; remove one; clear with confirmation
- [ ] Lists sync between two open tabs
- [ ] Theme toggle switches and survives reload with no flash; "Match my device" follows the OS
- [ ] Unknown film id shows the not-found page
- [ ] With the network cut to TMDB (wrong token), lists fall back to public domain with a notice

**Security**
- [ ] View page source: the TMDB token never appears; `/api/movies` responses contain no token
- [ ] `POST /api/revalidate` without the secret returns 401 (or 404 when no secret is set)
- [ ] Response headers include the Content-Security-Policy

## Accessibility checklist (WCAG 2.2 AA)

- [ ] **Keyboard**: every control reachable with Tab, visible focus ring, no traps. "Skip to content" appears on first Tab.
- [ ] **Screen reader** (VoiceOver on iOS, TalkBack on Android, NVDA on Windows):
  - [ ] Each film card reads as one link with title, year and rating source
  - [ ] Loading more films is announced (for example "Showing 48 of 2,393 films")
  - [ ] Watchlist and favorite buttons announce pressed state
  - [ ] Lists page tabs work with arrow keys and announce the selected tab
  - [ ] External links say they open in a new tab
- [ ] **Semantics**: one `h1` per page, headings in order, landmarks for header, main nav, main, footer
- [ ] **Forms**: every input and select has a label; radio groups and checkbox groups have a legend
- [ ] **Images**: posters are decorative (`alt=""`) because the link names the film; service logos are decorative next to the service name; icons are `aria-hidden`
- [ ] **Contrast**: text at least 4.5:1 in both themes (check muted text and badges with a contrast checker)
- [ ] **Touch targets**: buttons and nav items at least 44 by 44 px
- [ ] **Zoom**: page usable at 200% zoom and with large system text, no horizontal scrolling of the page
- [ ] **Motion**: with "Reduce motion" on, the loading skeleton does not pulse
- [ ] **Media**: video only plays after the viewer presses play; the native Commons player has controls
- [ ] Run Lighthouse or axe DevTools on Home, Browse, Film and Lists; fix anything above "minor"
