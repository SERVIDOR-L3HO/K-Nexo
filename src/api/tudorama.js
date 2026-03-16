const API = '/api'

export function proxyImg(url) {
  if (!url) return ''
  return `/api/img?url=${encodeURIComponent(url)}`
}

async function get(path) {
  try {
    const res = await fetch(`${API}${path}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.error('API error:', e)
    return null
  }
}

export async function getSeries(params = {}) {
  const q = new URLSearchParams({ per_page: 20, ...params }).toString()
  return await get(`/series?${q}`) || []
}

export async function getMovies(params = {}) {
  const q = new URLSearchParams({ per_page: 20, ...params }).toString()
  return await get(`/movies?${q}`) || []
}

export async function getSerieDetail(slug) {
  return await get(`/serie/${slug}`)
}

export async function getMovieDetail(slug) {
  return await get(`/movie/${slug}`)
}

export async function getEpisodes(serieId) {
  return await get(`/episodes/${serieId}`) || []
}

export async function getGenres() {
  return await get('/genres') || []
}

export async function search(query) {
  return await get(`/search?q=${encodeURIComponent(query)}`) || []
}

export async function getHome() {
  const [recientes, populares, movies] = await Promise.all([
    getSeries({ per_page: 15, orderby: 'date', order: 'desc' }),
    getSeries({ per_page: 15, orderby: 'modified', order: 'desc' }),
    getMovies({ per_page: 15 }),
  ])
  return { recientes, populares, movies }
}

export async function getByGenre(genreId, type = 'series') {
  if (type === 'movie') return getMovies({ genre: genreId, per_page: 24 })
  return getSeries({ genre: genreId, per_page: 24 })
}
