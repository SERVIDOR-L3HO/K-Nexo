import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001
const BASE = 'https://tudorama.com/wp-json/wp/v2'

app.use(cors())
app.use(express.json())

const EMBED_FIELDS = 'id,title,slug,link,excerpt,featured_media,crvs-genres,crvs-year,crvs-cast,crvs-director,date,modified,_embedded'

async function proxyFetch(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TuDoramaApp/1.0)' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function formatSerie(item) {
  const media = item._embedded?.['wp:featuredmedia']?.[0]
  const sizes = media?.media_details?.sizes || {}

  const poster = sizes.crvs_poster_single?.source_url
    || sizes['crvs-poster-single']?.source_url
    || sizes.medium_large?.source_url
    || sizes.medium?.source_url
    || media?.source_url
    || ''

  const backdrop = sizes.full?.source_url
    || sizes.large?.source_url
    || media?.source_url
    || ''

  const terms = item._embedded?.['wp:term']?.flat() || []
  const genres  = terms.filter(t => t.taxonomy === 'crvs-genres').map(t => t.name)
  const yearTerm = terms.find(t => t.taxonomy === 'crvs-year')
  const castTerms = terms.filter(t => t.taxonomy === 'crvs-cast').map(t => t.name)
  const dirTerms  = terms.filter(t => t.taxonomy === 'crvs-director').map(t => t.name)

  return {
    id: item.id,
    type: item.type || 'serie',
    title: item.title?.rendered || '',
    slug: item.slug,
    link: item.link,
    excerpt: item.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || '',
    poster,
    backdrop,
    genres,
    year: yearTerm?.name || '',
    cast: castTerms.join(', '),
    director: dirTerms.join(', '),
    date: item.date,
  }
}

/* ──────────────────────────────────────────
   IMAGE PROXY — bypasses hotlink protection
────────────────────────────────────────── */
app.get('/api/img', async (req, res) => {
  const { url } = req.query
  if (!url || !url.startsWith('https://tudorama.com')) {
    return res.status(400).send('Invalid URL')
  }
  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://tudorama.com/',
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

/* ──────────────────────────────────────────
   SERIES
────────────────────────────────────────── */
app.get('/api/series', async (req, res) => {
  try {
    const { page = 1, per_page = 20, genre, search, orderby = 'date', order = 'desc' } = req.query
    let url = `${BASE}/serie?per_page=${per_page}&page=${page}&_embed&orderby=${orderby}&order=${order}`
    if (genre) url += `&crvs-genres=${genre}`
    if (search) url += `&search=${encodeURIComponent(search)}`
    const data = await proxyFetch(url)
    res.json(data.map(formatSerie))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ──────────────────────────────────────────
   MOVIES
────────────────────────────────────────── */
app.get('/api/movies', async (req, res) => {
  try {
    const { page = 1, per_page = 20, genre, search } = req.query
    let url = `${BASE}/movie?per_page=${per_page}&page=${page}&_embed&orderby=date&order=desc`
    if (genre) url += `&crvs-genres=${genre}`
    if (search) url += `&search=${encodeURIComponent(search)}`
    const data = await proxyFetch(url)
    res.json(data.map(s => ({ ...formatSerie(s), type: 'movie' })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ──────────────────────────────────────────
   DETAIL pages
────────────────────────────────────────── */
app.get('/api/serie/:slug', async (req, res) => {
  try {
    const url = `${BASE}/serie?slug=${req.params.slug}&_embed`
    const data = await proxyFetch(url)
    if (!data.length) return res.status(404).json({ error: 'Not found' })
    res.json(formatSerie(data[0]))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/movie/:slug', async (req, res) => {
  try {
    const url = `${BASE}/movie?slug=${req.params.slug}&_embed`
    const data = await proxyFetch(url)
    if (!data.length) return res.status(404).json({ error: 'Not found' })
    res.json({ ...formatSerie(data[0]), type: 'movie' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ──────────────────────────────────────────
   EPISODES — correct approach via slug pattern
   Episodes slugs follow: {serieSlug}-s{season}x{episode}
   We scrape the serie page HTML to find max episode count
   then batch-fetch via WP REST API using slug filter.
────────────────────────────────────────── */
async function fetchEpisodesBySlugBatch(slugs) {
  if (!slugs.length) return []
  const chunkSize = 50
  const chunks = []
  for (let i = 0; i < slugs.length; i += chunkSize) {
    chunks.push(slugs.slice(i, i + chunkSize))
  }
  const results = await Promise.all(chunks.map(chunk => {
    const url = `${BASE}/episodes?slug=${chunk.join(',')}&per_page=100&orderby=date&order=asc&_embed`
    return proxyFetch(url).catch(() => [])
  }))
  return results.flat()
}

function formatEpisode(ep) {
  const media = ep._embedded?.['wp:featuredmedia']?.[0]
  const sizes = media?.media_details?.sizes || {}
  const thumb = sizes.crvs_thumbnail_episode?.source_url
    || sizes.thumbnail?.source_url
    || sizes.medium?.source_url
    || media?.source_url || ''
  return {
    id: ep.id,
    title: ep.title?.rendered || '',
    slug: ep.slug,
    link: ep.link,
    date: ep.date,
    thumbnail: thumb,
    excerpt: ep.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || '',
  }
}

app.get('/api/episodes/:serieId', async (req, res) => {
  try {
    const { serieSlug, serieLink } = req.query

    // If no serieSlug/serieLink, fall back gracefully
    if (!serieSlug || !serieLink) {
      return res.json([])
    }

    // 1. Fetch the serie page HTML to discover episode structure
    const html = await fetchHtml(serieLink).catch(() => '')

    // 2. Extract all episode <li class="lep"> elements
    const lepBlocks = html.match(/<li class="lep"[^>]*>[\s\S]*?<\/li>/g) || []

    // Parse each visible episode to find: season number, episode number, slug prefix
    const seasonMap = {}   // { seasonNum: { base: string, maxEp: number } }

    for (const block of lepBlocks) {
      const seasonMatch = block.match(/data-season="(\d+)"/)
      const episodeMatch = block.match(/data-episode="(\d+)"/)
      const hrefMatch = block.match(/href="https:\/\/tudorama\.com\/ver\/([^\/]+)\/"/)
      if (!seasonMatch || !episodeMatch || !hrefMatch) continue

      const seasonNum = parseInt(seasonMatch[1])
      const epNum = parseInt(episodeMatch[1])
      const epSlug = hrefMatch[1]   // e.g. goblin-el-solitario-ser-inmortal-s1x16

      // Derive the season base slug: everything before "x{epNum}" at the end
      const base = epSlug.replace(new RegExp(`x${epNum}$`), 'x')

      if (!seasonMap[seasonNum]) {
        seasonMap[seasonNum] = { base, maxEp: epNum }
      } else {
        if (epNum > seasonMap[seasonNum].maxEp) {
          seasonMap[seasonNum].maxEp = epNum
        }
      }
    }

    // 3. If we found season data, build all episode slugs
    let allEpisodeData = []

    if (Object.keys(seasonMap).length > 0) {
      const allSlugs = []
      for (const [, { base, maxEp }] of Object.entries(seasonMap)) {
        for (let ep = 1; ep <= maxEp; ep++) {
          allSlugs.push(`${base}${ep}`)
        }
      }
      const rawEps = await fetchEpisodesBySlugBatch(allSlugs)
      allEpisodeData = rawEps
        .map(formatEpisode)
        .sort((a, b) => {
          // Sort by episode number extracted from slug
          const numA = parseInt(a.slug.match(/x(\d+)$/)?.[1] || 0)
          const numB = parseInt(b.slug.match(/x(\d+)$/)?.[1] || 0)
          return numA - numB
        })
    }

    res.json(allEpisodeData)
  } catch (e) {
    console.error('episodes error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

/* ──────────────────────────────────────────
   GENRES
────────────────────────────────────────── */
app.get('/api/genres', async (req, res) => {
  try {
    const url = `${BASE}/crvs-genres?per_page=50&orderby=count&order=desc&hide_empty=true`
    const data = await proxyFetch(url)
    res.json(data.map(g => ({ id: g.id, name: g.name, slug: g.slug, count: g.count })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ──────────────────────────────────────────
   SEARCH
────────────────────────────────────────── */
app.get('/api/search', async (req, res) => {
  try {
    const { q = '' } = req.query
    const [series, movies] = await Promise.all([
      proxyFetch(`${BASE}/serie?search=${encodeURIComponent(q)}&per_page=12&_embed`),
      proxyFetch(`${BASE}/movie?search=${encodeURIComponent(q)}&per_page=12&_embed`),
    ])
    res.json([
      ...series.map(formatSerie),
      ...movies.map(s => ({ ...formatSerie(s), type: 'movie' })),
    ])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ──────────────────────────────────────────
   VIDEO PLAYER — fetch servers for an episode
   Steps:
   1. Fetch episode page HTML → extract nonce + post_id
   2. POST to wp-admin/admin-ajax.php (corvus_get_servers) → get server list
   3. For each server URL, fetch it (with Referer) and extract the video iframe src
────────────────────────────────────────── */

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0',
      'Referer': 'https://tudorama.com/',
      'Accept': 'text/html',
    }
  })
  return res.text()
}

function extractNonce(html) {
  const m = html.match(/data-nonce="([^"]+)"/)
  return m ? m[1] : null
}

async function getServers(postId, nonce, lang = '') {
  const body = new URLSearchParams()
  body.append('action', 'corvus_get_servers')
  body.append('nonce', nonce)
  body.append('post_id', postId)
  if (lang) body.append('lang', lang)

  const res = await fetch('https://tudorama.com/wp-admin/admin-ajax.php', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://tudorama.com/',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  })
  return res.json()
}

async function followRedirect(url) {
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://tudorama.com/' }
    })
    if (res.status >= 300 && res.status < 400) {
      return res.headers.get('location') || url
    }
    return url
  } catch {
    return url
  }
}

async function extractVideoSrc(playerUrl) {
  try {
    const html = await fetchHtml(playerUrl)
    // Look for iframe.src = "..." pattern (JS assignment)
    let m = html.match(/iframe\.src\s*=\s*["']([^"']+)["']/)
    if (m) {
      const src = m[1]
      // Follow redirect if it's a shortlink
      if (src.includes('short.icu') || src.includes('go.') || src.includes('bit.ly')) {
        return await followRedirect(src)
      }
      return src
    }
    // Look for <iframe src="..."> 
    m = html.match(/<iframe[^>]+src=["']([^"'hb][^"']+)["']/)
    if (m && !m[1].includes('cdn.tudorama.com')) return m[1]
    // Look for short.icu links in strings
    m = html.match(/["'](https?:\/\/short\.icu\/[^"']+)["']/)
    if (m) return await followRedirect(m[1])
    return null
  } catch {
    return null
  }
}

/* GET /api/episode-players/:episodePostId
   Returns list of {name, lang, type, embedUrl} */
app.get('/api/episode-players/:episodePostId', async (req, res) => {
  try {
    const { episodePostId } = req.params
    const { epLink } = req.query  // pass the episode's link URL

    if (!epLink) return res.status(400).json({ error: 'epLink required' })

    // 1. Fetch episode page to get nonce
    const html = await fetchHtml(epLink)
    const nonce = extractNonce(html)
    if (!nonce) return res.status(500).json({ error: 'Could not extract nonce' })

    // 2. Get servers for all languages
    const [subServers, latServers] = await Promise.all([
      getServers(episodePostId, nonce, 'en'),
      getServers(episodePostId, nonce, 'es'),
    ])

    // Merge and deduplicate by playerUrl
    const seen = new Set()
    const allServers = []
    for (const s of [...latServers.map(s => ({ ...s, langLabel: 'Latino' })), ...subServers.map(s => ({ ...s, langLabel: 'Subtitulado' }))]) {
      if (!seen.has(s.url)) {
        seen.add(s.url)
        allServers.push(s)
      }
    }

    // 3. Extract direct video src from each player
    const results = await Promise.all(
      allServers.map(async (s) => {
        const directSrc = await extractVideoSrc(s.url)
        // abysscdn.com has X-Frame-Options: sameorigin — won't work cross-origin
        const embeddable = directSrc && !directSrc.includes('abysscdn.com')
        return {
          name: s.name,
          lang: s.lang,
          langLabel: s.langLabel,
          type: s.type,
          playerUrl: s.url,
          directSrc,
          embeddable,  // false for known blocked hosts
        }
      })
    )

    res.json(results.filter(r => r.playerUrl || r.directSrc))
  } catch (e) {
    console.error('episode-players error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

/* GET /api/player-proxy?url=...
   Proxies any video player page through our server:
   - Fetches with Referer: tudorama.com so hosts think it's an authorized embed
   - Injects script to spoof document.referrer for client-side domain checks
   - Rewrites relative URLs to absolute, removes X-Frame-Options/CSP */
app.get('/api/player-proxy', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).send('URL required')

  let parsedUrl
  try { parsedUrl = new URL(url) } catch { return res.status(400).send('Invalid URL') }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0',
        'Referer': 'https://tudorama.com/',
        'Origin': 'https://tudorama.com',
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

    // Rewrite root-relative URLs to absolute (keeps assets loading correctly)
    html = html
      .replace(/(\ssrc=")\/(?!\/)/g, `$1${origin}/`)
      .replace(/(\shref=")\/(?!\/)/g, `$1${origin}/`)
      .replace(/(\saction=")\/(?!\/)/g, `$1${origin}/`)
      .replace(/(url\(["']?)\/(?!\/)/g, `$1${origin}/`)

    // Inject script BEFORE anything else to spoof document.referrer
    // and suppress domain-check errors before player JS runs
    const spoof = `<script>
(function(){
  try {
    Object.defineProperty(document,'referrer',{get:function(){return'https://tudorama.com/'},configurable:true});
  } catch(e){}
  // Patch window.location for players that read it
  try {
    var _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m,u){
      if(typeof u==='string' && u.includes('domain') && u.includes('check')) return;
      return _open.apply(this,arguments);
    };
  } catch(e){}
})();
</script>`

    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + spoof)
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', '<html>' + spoof)
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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API proxy running on port ${PORT}`)
  })
}

export default app
