export const config = { runtime: 'edge' }

const GQL_URL = 'https://sv1.fluxcedene.net/api/gql'
const GQL_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, */*',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'platform': 'doramasflix',
  'x-access-platform': 'doramasgo',
  'Referer': 'https://doramasflix.in/',
  'Origin': 'https://doramasflix.in',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

async function gql(query, variables = {}) {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: GQL_HEADERS,
    body: JSON.stringify({ query, variables }),
  })
  const text = await res.text()
  if (text.trim().startsWith('<')) {
    throw new Error(`La API externa bloqueó la solicitud (HTTP ${res.status})`)
  }
  const data = JSON.parse(text)
  if (data.errors?.length) throw new Error(data.errors[0].message)
  return data.data
}

/* ── GraphQL Queries ── */
const Q_LIST = `
  query paginationDorama($page: Int, $perPage: Int, $sort: SortFindManyDoramaInput) {
    paginationDorama(page: $page, perPage: $perPage, sort: $sort) {
      items {
        _id name name_es slug poster poster_path backdrop backdrop_path
        first_air_date vote_average overview isTVShow
        genres { name slug }
      }
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

/* ── Formatters ── */
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

function serverNameFromEmbed(embed) {
  try {
    const host = new URL(embed).hostname.replace('www.', '')
    const MAP = {
      'ok.ru': 'OK.ru', 'uqload': 'Uqload', 'voe.sx': 'VoeSX',
      'myvidplay': 'MyVidPlay', 'streamwish': 'StreamWish', 'filemoon': 'Filemoon',
      'doodstream': 'DoodStream', 'streamlare': 'StreamLare', 'mp4upload': 'Mp4Upload',
      'mixdrop': 'MixDrop', 'bysejikuar': 'Mirror',
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

/* ── Router ── */
export default async function handler(req) {
  const url = new URL(req.url)
  const path = url.pathname
  const params = url.searchParams

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    /* /api/genres */
    if (path === '/api/genres') {
      return json(GENRES)
    }

    /* /api/series */
    if (path === '/api/series') {
      const page = parseInt(params.get('page') || '1')
      const perPage = parseInt(params.get('per_page') || '24')
      const data = await gql(Q_LIST, { page, perPage, sort: 'POPULARITY_DESC' })
      return json(data.paginationDorama.items.map(formatDorama))
    }

    /* /api/movies */
    if (path === '/api/movies') {
      const page = parseInt(params.get('page') || '1')
      const perPage = parseInt(params.get('per_page') || '24')
      const data = await gql(Q_LIST, { page, perPage, sort: 'POPULARITY_DESC' })
      return json(data.paginationDorama.items.map(formatDorama))
    }

    /* /api/search */
    if (path === '/api/search') {
      const q = params.get('q')
      if (!q) return json([])
      const data = await gql(Q_SEARCH, { input: q })
      const results = (data.searchDorama || []).map(d => ({
        id: d._id, type: 'serie',
        title: d.name_es || d.name, originalTitle: d.name,
        slug: d.slug, poster: tmdbImg(d.poster || d.poster_path, 'w300'),
        genres: [], year: '', excerpt: '',
      }))
      return json(results)
    }

    /* /api/serie/:slug */
    const serieMatch = path.match(/^\/api\/serie\/(.+)$/)
    if (serieMatch) {
      const data = await gql(Q_DETAIL, { slug: serieMatch[1] })
      if (!data.detailDorama) return json({ error: 'Not found' }, 404)
      return json(formatDorama(data.detailDorama))
    }

    /* /api/movie/:slug */
    const movieMatch = path.match(/^\/api\/movie\/(.+)$/)
    if (movieMatch) {
      const data = await gql(Q_DETAIL, { slug: movieMatch[1] })
      if (!data.detailDorama) return json({ error: 'Not found' }, 404)
      return json({ ...formatDorama(data.detailDorama), type: 'movie' })
    }

    /* /api/episodes/:serieId */
    const episodesMatch = path.match(/^\/api\/episodes\/(.+)$/)
    if (episodesMatch) {
      const data = await gql(Q_EPISODES, { serie_id: episodesMatch[1] })
      return json((data.listEpisodes || []).map(formatEpisode))
    }

    /* /api/episode-links/:episodeId */
    const linksMatch = path.match(/^\/api\/episode-links\/(.+)$/)
    if (linksMatch) {
      const data = await gql(Q_LINKS, { id: linksMatch[1], app: 'doramasgo' })
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
      return json(servers)
    }

    /* /api/img — image proxy */
    if (path === '/api/img') {
      const imgUrl = params.get('url')
      if (!imgUrl) return new Response('Invalid URL', { status: 400 })
      try {
        const u = new URL(imgUrl)
        const allowed = ['image.tmdb.org', 'doramasflix.in']
        if (!allowed.some(h => u.hostname.includes(h))) {
          return new Response('Invalid URL', { status: 400 })
        }
      } catch {
        return new Response('Invalid URL', { status: 400 })
      }
      const upstream = await fetch(imgUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://doramasflix.in/' }
      })
      if (!upstream.ok) return new Response('Not found', { status: upstream.status })
      const contentType = upstream.headers.get('content-type') || 'image/jpeg'
      return new Response(upstream.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          ...CORS_HEADERS,
        }
      })
    }

    /* /api/player-proxy */
    if (path === '/api/player-proxy') {
      const proxyUrl = params.get('url')
      if (!proxyUrl) return new Response('URL required', { status: 400 })
      let parsedUrl
      try { parsedUrl = new URL(proxyUrl) } catch { return new Response('Invalid URL', { status: 400 }) }

      const upstream = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://doramasflix.in/',
          'Origin': 'https://doramasflix.in',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
        }
      })

      const contentType = upstream.headers.get('content-type') || 'text/html'

      if (!contentType.includes('text/html')) {
        return new Response(upstream.body, {
          headers: { 'Content-Type': contentType, ...CORS_HEADERS }
        })
      }

      const origin = `${parsedUrl.protocol}//${parsedUrl.host}`
      let html = await upstream.text()
      html = html
        .replace(/(\ssrc=")\/(?!\/)/g, `$1${origin}/`)
        .replace(/(\shref=")\/(?!\/)/g, `$1${origin}/`)
        .replace(/(\saction=")\/(?!\/)/g, `$1${origin}/`)
        .replace(/(url\(["']?)\/(?!\/)/g, `$1${origin}/`)

      const spoof = `<script>(function(){try{Object.defineProperty(document,'referrer',{get:function(){return'https://doramasflix.in/'},configurable:true});}catch(e){}})();</script>`
      html = html.includes('<head>') ? html.replace('<head>', '<head>' + spoof) : spoof + html

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'X-Frame-Options': 'ALLOWALL',
          ...CORS_HEADERS,
        }
      })
    }

    return json({ error: 'Not found' }, 404)
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}
