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
   EPISODES
────────────────────────────────────────── */
app.get('/api/episodes/:serieId', async (req, res) => {
  try {
    const url = `${BASE}/episodes?serie=${req.params.serieId}&per_page=100&orderby=date&order=asc&_embed`
    const data = await proxyFetch(url)
    const formatted = data.map(ep => {
      const media = ep._embedded?.['wp:featuredmedia']?.[0]
      const sizes = media?.media_details?.sizes || {}
      const thumb = sizes.crvs_thumbnail_episode?.source_url
        || sizes.thumbnail?.source_url
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
    })
    res.json(formatted)
  } catch (e) {
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

app.listen(PORT, () => {
  console.log(`API proxy running on port ${PORT}`)
})
