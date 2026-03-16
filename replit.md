# TuDorama — Korean/Asian Drama Streaming Platform

## Overview
A professional streaming platform for Korean/Asian doramas, displaying content sourced from tudorama.com's public WordPress REST API. Videos link out to tudorama.com for actual playback.

## Tech Stack
- **Frontend**: React + Vite (port 5000), React Router, Tailwind CSS
- **Backend**: Express.js proxy server (port 3001)
- **Styling**: Dark purple theme (`#07070f` bg), Inter font, responsive design
- **Content**: tudorama.com WordPress REST API (public, no auth)

## Architecture
```
User → Vite (5000) → /api/* → Express (3001) → tudorama.com WP REST API
                   → /api/img → image proxy (bypasses hotlinking)
```

## Key Files
| File | Purpose |
|------|---------|
| `server.js` | Express proxy: series, movies, episodes, genres, search, image proxy |
| `src/api/tudorama.js` | Frontend API helpers + `proxyImg()` utility |
| `src/App.jsx` | Routes: `/`, `/browse`, `/serie/:slug`, `/pelicula/:slug` |
| `src/pages/Home.jsx` | Hero + category grid + content rows |
| `src/pages/Browse.jsx` | Grid browse with type tabs + genre pills |
| `src/pages/Detail.jsx` | Series/movie detail page with episodes |
| `src/components/Navbar.jsx` | Fixed navbar with search, series dropdown, mobile menu |
| `src/components/HeroSection.jsx` | Auto-rotating hero with backdrop images |
| `src/components/SeriesCard.jsx` | Vertical 2:3 poster card |
| `src/components/ContentRow.jsx` | Horizontal scrollable row |
| `vite.config.js` | Proxies `/api` → `http://localhost:3001` |

## WordPress API Quirks
- `crvs-genres`, `crvs-year`, `crvs-cast`, `crvs-director` fields contain **term IDs** not strings
- Actual names come from `_embedded['wp:term']` filtered by taxonomy
- Custom post types: `serie`, `movie`, `episodes`, `season`
- Genre taxonomy: `crvs-genres`; Year taxonomy: `crvs-year`
- Images need to be proxied via `/api/img?url=...` to bypass hotlinking

## Image Proxy
All content images from `tudorama.com/wp-content/uploads/` are proxied through `/api/img?url=<encoded-url>` with correct Referer header. The `proxyImg()` utility in `src/api/tudorama.js` handles URL conversion.

## Workflows
- **Start application**: `npm run dev` — runs both Express (port 3001) and Vite (port 5000) concurrently

## User Preferences
- Platform name: "TuDorama" with cherry blossom logo
- Language: Spanish (UI in Spanish)
- Design: Dark purple (`#07070f`), purple/magenta gradient accent, white CTAs
- Cards: Vertical 2:3 poster format (Netflix-style)
- Video playback: External links to tudorama.com (no embedding)
