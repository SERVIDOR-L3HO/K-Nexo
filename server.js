import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

/* ─────────────────────────────────────────────────
   GRAPHQL CLIENT  ·  doramasflix.in / fluxcedene
───────────────────────────────────────────────── */
const GQL_URL = 'https://sv1.fluxcedene.net/api/gql'
const GQL_HEADERS = {
  'Content-Type': 'application/json',
  'platform': 'doramasflix',
  'x-access-platform': 'doramasgo',
  'Referer': 'https://doramasflix.in/',
  'Origin': 'https://doramasflix.in',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

async function gql(query, variables = {}) {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: GQL_HEADERS,
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

/* ─────────────────────────────────────────────────
   IMAGE HELPERS  (TMDB is public — no proxy needed)
───────────────────────────────────────────────── */
function tmdbImg(path, size = 'w300') {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `https://image.tmdb.org/t/p/${size}${path}`
}

function formatDorama(d) {
  if (!d) return null
  return {
    id: d._id,
    type: 'serie',
    title: d.name_es || d.name,
    originalTitle: d.name,
    slug: d.slug,
    poster: tmdbImg(d.poster || d.poster_path, 'w300'),
    backdrop: tmdbImg(d.backdrop || d.backdrop_path, 'w1280'),
    year: d.first_air_date ? String(d.first_air_date).slice(0, 4) : '',
    genres: d.genres?.map(g => g.name) || [],
    excerpt: d.overview || '',
    vote: d.vote_average || null,
    cast: '',
    director: '',
    networks: d.networks?.map(n => n.name) || [],
  }
}

function formatEpisode(ep) {
  if (!ep) return null
  return {
    id: ep._id,
    title: ep.name,
    slug: ep.slug,
    thumbnail: tmdbImg(ep.still_path, 'w300'),
    excerpt: ep.overview || '',
    date: ep.air_date || '',
    episodeNumber: ep.episode_number,
    seasonNumber: ep.season_number,
  }
}

/* ─────────────────────────────────────────────────
   GraphQL queries
───────────────────────────────────────────────── */
const Q_LIST = `
  query paginationDorama($page: Int, $perPage: Int, $sort: SortFindManyDoramaInput) {
    paginationDorama(page: $page, perPage: $perPage, sort: $sort) {
      items {
        _id name name_es slug poster poster_path backdrop backdrop_path
        first_air_date vote_average overview isTVShow
        genres { name slug }
      }
      count
      pageInfo { hasNextPage }
    }
  }
`

const Q_DETAIL = `
  query detailDorama($slug: String!) {
    detailDorama(filter: { slug: $slug }) {
      _id name name_es slug poster poster_path backdrop backdrop_path
      first_air_date vote_average overview isTVShow
      genres { name slug }
      networks { name }
    }
  }
`

const Q_EPISODES = `
  query listEpisodes($serie_id: MongoID!) {
    listEpisodes(sort: NUMBER_ASC, filter: { type_serie: "dorama", serie_id: $serie_id }) {
      _id name slug episode_number season_number still_path air_date overview
    }
  }
`

const Q_SEARCH = `
  query searchDorama($input: String!) {
    searchDorama(input: $input, limit: 12) {
      _id slug name name_es isTVShow poster_path poster
    }
  }
`

const Q_LINKS = `
  query GetEpisodeLinks($id: MongoID!, $app: String) {
    getEpisodeLinks(id: $id, app: $app) {
      links_online
    }
  }
`

/* ─────────────────────────────────────────────────
   IMAGE PROXY  (TMDB images go directly, no proxy)
───────────────────────────────────────────────── */
app.get('/api/img', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).send('Invalid URL')

  try {
    const u = new URL(url)
    const allowedHosts = ['image.tmdb.org', 'doramasflix.in']
    const isAllowed = allowedHosts.some(h => u.hostname.includes(h))
    if (!isAllowed) return res.status(400).send('Invalid URL')
  } catch {
    return res.status(400).send('Invalid URL')
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://doramasflix.in/',
      }
    })
    if (!upstream.ok) return res.status(upstream.status).send('Not found')
    const type = upstream.headers.get('content-type') || 'image/jpeg'
    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    const buf = await upstream.arrayBuffer()
    res.send(Buffer.from(buf))
  } catch (e) {
    res.status(500).send('Proxy error')
  }
})

/* ─────────────────────────────────────────────────
   SERIES  (doramas — popular listing)
───────────────────────────────────────────────── */
app.get('/api/series', async (req, res) => {
  try {
    const { page = 1, per_page = 24 } = req.query
    const data = await gql(Q_LIST, {
      page: parseInt(page),
      perPage: parseInt(per_page),
      sort: 'POPULARITY_DESC',
    })
    res.json(data.paginationDorama.items.map(formatDorama))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ─────────────────────────────────────────────────
   MOVIES  (same source — shows doramas)
───────────────────────────────────────────────── */
app.get('/api/movies', async (req, res) => {
  try {
    const { page = 1, per_page = 24 } = req.query
    const data = await gql(Q_LIST, {
      page: parseInt(page),
      perPage: parseInt(per_page),
      sort: 'POPULARITY_DESC',
    })
    res.json(data.paginationDorama.items.map(formatDorama))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ─────────────────────────────────────────────────
   DETAIL PAGES
───────────────────────────────────────────────── */
app.get('/api/serie/:slug', async (req, res) => {
  try {
    const data = await gql(Q_DETAIL, { slug: req.params.slug })
    if (!data.detailDorama) return res.status(404).json({ error: 'Not found' })
    res.json(formatDorama(data.detailDorama))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/movie/:slug', async (req, res) => {
  try {
    const data = await gql(Q_DETAIL, { slug: req.params.slug })
    if (!data.detailDorama) return res.status(404).json({ error: 'Not found' })
    res.json({ ...formatDorama(data.detailDorama), type: 'movie' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ─────────────────────────────────────────────────
   EPISODES  — by serie MongoDB _id
───────────────────────────────────────────────── */
app.get('/api/episodes/:serieId', async (req, res) => {
  try {
    const data = await gql(Q_EPISODES, { serie_id: req.params.serieId })
    res.json((data.listEpisodes || []).map(formatEpisode))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ─────────────────────────────────────────────────
   EPISODE VIDEO LINKS  (new endpoint)
───────────────────────────────────────────────── */
function serverNameFromEmbed(embed) {
  try {
    const host = new URL(embed).hostname.replace('www.', '')
    const MAP = {
      'ok.ru': 'OK.ru',
      'uqload': 'Uqload',
      'voe.sx': 'VoeSX',
      'myvidplay': 'MyVidPlay',
      'streamwish': 'StreamWish',
      'filemoon': 'Filemoon',
      'doodstream': 'DoodStream',
      'streamlare': 'StreamLare',
      'mp4upload': 'Mp4Upload',
      'mixdrop': 'MixDrop',
      'bysejikuar': 'Mirror',
    }
    for (const [k, v] of Object.entries(MAP)) {
      if (host.includes(k)) return v
    }
    const raw = host.split('.')[0]
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  } catch {
    return 'Servidor'
  }
}

app.get('/api/episode-links/:episodeId', async (req, res) => {
  try {
    const data = await gql(Q_LINKS, {
      id: req.params.episodeId,
      app: 'doramasgo',
    })
    const links = data.getEpisodeLinks?.links_online || []
    const servers = links
      .filter(l => l.is_active && (l.embed || l.link))
      .map((l, i) => ({
        id: l._id || String(i),
        embed: l.embed || null,
        link: l.link || null,
        server: l.server,
        languageCode: l.language_code || 'ko',
        name: serverNameFromEmbed(l.embed || l.link || ''),
      }))
    res.json(servers)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ─────────────────────────────────────────────────
   SEARCH
───────────────────────────────────────────────── */
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.json([])
    const data = await gql(Q_SEARCH, { input: q })
    const results = (data.searchDorama || []).map(d => ({
      id: d._id,
      type: 'serie',
      title: d.name_es || d.name,
      originalTitle: d.name,
      slug: d.slug,
      poster: tmdbImg(d.poster || d.poster_path, 'w300'),
      genres: [],
      year: '',
      excerpt: '',
    }))
    res.json(results)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ─────────────────────────────────────────────────
   GENRES  (curated list — doramasflix genres)
───────────────────────────────────────────────── */
const GENRES = [
  { id: 'romance', slug: 'romance', name: 'Romance', count: 300 },
  { id: 'comedia', slug: 'comedia', name: 'Comedia', count: 200 },
  { id: 'drama', slug: 'drama', name: 'Drama', count: 400 },
  { id: 'accion', slug: 'accion', name: 'Acción', count: 150 },
  { id: 'thriller', slug: 'thriller', name: 'Thriller', count: 100 },
  { id: 'ciencia-ficcion', slug: 'ciencia-ficcion', name: 'Ciencia ficción', count: 80 },
  { id: 'fantasia', slug: 'fantasia', name: 'Fantasía', count: 120 },
  { id: 'historico', slug: 'historico', name: 'Histórico', count: 90 },
  { id: 'misterio', slug: 'misterio', name: 'Misterio', count: 70 },
  { id: 'aventura', slug: 'aventura', name: 'Aventura', count: 60 },
  { id: 'melodrama', slug: 'melodrama', name: 'Melodrama', count: 50 },
  { id: 'suspenso', slug: 'suspenso', name: 'Suspenso', count: 40 },
]

app.get('/api/genres', (_req, res) => {
  res.json(GENRES)
})

/* ─────────────────────────────────────────────────
   PLAYER PROXY  (proxy video embeds with correct Referer)
───────────────────────────────────────────────── */
app.get('/api/player-proxy', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).send('URL required')

  let parsedUrl
  try { parsedUrl = new URL(url) } catch { return res.status(400).send('Invalid URL') }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://doramasflix.in/',
        'Origin': 'https://doramasflix.in',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      }
    })

    const contentType = upstream.headers.get('content-type') || 'text/html'

    if (!contentType.includes('text/html')) {
      const buf = await upstream.arrayBuffer()
      res.setHeader('Content-Type', contentType)
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.send(Buffer.from(buf))
    }

    let html = await upstream.text()
    const origin = `${parsedUrl.protocol}//${parsedUrl.host}`

    html = html
      .replace(/(\ssrc=")\/(?!\/)/g, `$1${origin}/`)
      .replace(/(\shref=")\/(?!\/)/g, `$1${origin}/`)
      .replace(/(\saction=")\/(?!\/)/g, `$1${origin}/`)
      .replace(/(url\(["']?)\/(?!\/)/g, `$1${origin}/`)

    const spoof = `<script>
(function(){
  try {
    Object.defineProperty(document,'referrer',{get:function(){return'https://doramasflix.in/'},configurable:true});
  } catch(e){}
})();
</script>`

    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + spoof)
    } else {
      html = spoof + html
    }

    res.setHeader('Content-Type', 'text/html; charset=UTF-8')
    res.setHeader('X-Frame-Options', 'ALLOWALL')
    res.removeHeader('Content-Security-Policy')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(html)
  } catch (e) {
    res.status(500).send('Proxy error: ' + e.message)
  }
})

/* ─────────────────────────────────────────────────
   START
───────────────────────────────────────────────── */
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API proxy running on port ${PORT}`)
  })
}

export default app
