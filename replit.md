# TuDorama — Korean/Asian Drama Streaming Platform

## Overview
A professional streaming platform for Korean/Asian doramas with Spanish UI, sourcing data from **doramasflix.in** via their GraphQL API. Internal video player with multiple server options.

## Tech Stack
- **Frontend**: React + Vite (port 5000), React Router, Tailwind CSS
- **Backend**: Express.js proxy server (port 3001)
- **Styling**: Dark purple theme (`#07070f` bg), Inter font, responsive design
- **Content Source**: doramasflix.in → GraphQL API at `sv1.fluxcedene.net/api/gql`
- **Images**: TMDB (The Movie Database) — public, no proxy needed

## Architecture
```
User → Vite (5000) → /api/* → Express (3001) → sv1.fluxcedene.net/api/gql (GraphQL)
                   → /api/img → image proxy (for non-TMDB images)
                   → /api/player-proxy → video embed proxy (Referer spoofing)
```

## GraphQL API
- **URL**: `https://sv1.fluxcedene.net/api/gql`
- **Required headers**:
  - `platform: doramasflix`
  - `x-access-platform: doramasgo`
  - `Referer: https://doramasflix.in/`
  - `Origin: https://doramasflix.in`

## Key Queries
| Query | Purpose |
|-------|---------|
| `paginationDorama(page, perPage, sort)` | List doramas with pagination |
| `detailDorama(filter: {slug})` | Single dorama detail |
| `listEpisodes(sort, filter: {type_serie, serie_id})` | Episodes for a series |
| `searchDorama(input, limit)` | Search doramas |
| `GetEpisodeLinks(id, app: "doramasgo")` | Video server links for an episode |

## Key Files
| File | Purpose |
|------|---------|
| `server.js` | Express proxy: series, movies, episodes, genres, search, video links, image proxy |
| `src/api/tudorama.js` | Frontend API helpers + `proxyImg()` utility |
| `src/App.jsx` | Routes: `/`, `/browse`, `/serie/:slug`, `/pelicula/:slug`, `/player` |
| `src/pages/Home.jsx` | Hero + category grid + content rows |
| `src/pages/Browse.jsx` | Grid browse with type tabs + genre pills |
| `src/pages/Detail.jsx` | Series/movie detail page with episodes |
| `src/pages/Player.jsx` | Internal video player with server selection |
| `src/components/Navbar.jsx` | Fixed navbar with search, series dropdown, mobile menu |
| `src/components/HeroSection.jsx` | Auto-rotating hero with backdrop images |
| `src/components/SeriesCard.jsx` | Vertical 2:3 poster card |
| `src/components/ContentRow.jsx` | Horizontal scrollable row |
| `vite.config.js` | Proxies `/api` → `http://localhost:3001` |
| `api/index.js` | Vercel serverless entrypoint |
| `vercel.json` | Vercel deployment config |

## Data Format (from GraphQL)
- `_id`: MongoDB ObjectId (used as the episode/series ID throughout the app)
- `poster_path`, `backdrop_path`: TMDB image paths (e.g. `/abc123.jpg`)
- Images: constructed as `https://image.tmdb.org/t/p/{size}{path}`
- Episode slug format: `{serie-slug}-{season}x{episode}` e.g. `love-phobia-1x1`
- Series slug format: `{serie-slug}` e.g. `love-phobia`

## Video Player System
1. User clicks episode → `/player?id=EPISODE_MONGO_ID&title=...&serieSlug=...&serieTitle=...`
2. `Player.jsx` calls `getEpisodeLinks(episodeId)` → `/api/episode-links/:episodeId`
3. Backend calls `GetEpisodeLinks` GraphQL query with `app: "doramasgo"`
4. Returns `links_online` array: `{ embed, link, server, languageCode, name, is_active }`
5. Frontend shows server selection buttons, embeds `embed` URL in iframe

### Known video hosts (from doramasflix.in)
- **OK.ru** (`ok.ru/videoembed/...`) — embeddable ✓
- **Uqload** (`uqload.is/embed-...`) — embeddable ✓
- **VoeSX** (`voe.sx/e/...`) — embeddable ✓
- **MyVidPlay** (`myvidplay.com/e/...`) — embeddable ✓
- **StreamWish**, **Filemoon**, **MixDrop** — embeddable (varies)

### Player proxy fallback
If direct embed fails, `/api/player-proxy?url=...` proxies the HTML with `Referer: doramasflix.in`.

## Workflows
- **Start application**: `npm run dev` — runs both Express (port 3001) and Vite (port 5000) concurrently

## User Preferences
- Platform name: "TuDorama" with cherry blossom logo
- Language: Spanish (UI in Spanish)
- Design: Dark purple (`#07070f`), purple/magenta gradient accent, white CTAs
- Cards: Vertical 2:3 poster format (Netflix-style)
- Source doramas titles in Spanish (`name_es` field preferred)
