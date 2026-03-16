import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import SeriesCard, { SeriesCardSkeleton } from '../components/SeriesCard'
import { getSeries, getMovies, search, getGenres } from '../api/tudorama'

export default function Browse() {
  const [params] = useSearchParams()
  const type = params.get('type') || 'series'
  const genreSlug = params.get('genre')
  const query = params.get('q')

  const [items, setItems] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGenres().then(setGenres)
  }, [])

  useEffect(() => {
    setLoading(true)
    setItems([])
    async function load() {
      let results = []
      if (query) {
        results = await search(query)
      } else {
        const genre = genres.find(g => g.slug === genreSlug)
        const params = genre ? { genre: genre.id, per_page: 24 } : { per_page: 24 }
        if (type === 'movies') {
          results = await getMovies(params)
        } else {
          results = await getSeries(params)
        }
      }
      setItems(results)
      setLoading(false)
    }
    load()
  }, [type, genreSlug, query, genres])

  const title = query
    ? `Resultados: "${query}"`
    : genreSlug
    ? genres.find(g => g.slug === genreSlug)?.name || 'Categoría'
    : type === 'movies' ? '🎬 Películas' : '🌸 Series & Doramas'

  return (
    <main className="min-h-screen pt-16 pb-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-6">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {!query && (
            <p className="text-white/35 text-sm mt-1">
              {loading ? 'Cargando…' : `${items.length} títulos`}
            </p>
          )}
        </div>

        {/* Type tabs */}
        {!query && (
          <div className="px-4 sm:px-6 mb-4 flex items-center gap-2">
            <Link to="/browse?type=series" className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${type === 'series' ? 'bg-white text-dark-900' : 'bg-dark-700 text-white/60 hover:bg-dark-600 hover:text-white'}`}>
              Series
            </Link>
            <Link to="/browse?type=movies" className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${type === 'movies' ? 'bg-white text-dark-900' : 'bg-dark-700 text-white/60 hover:bg-dark-600 hover:text-white'}`}>
              Películas
            </Link>
          </div>
        )}

        {/* Genre pills */}
        {!query && genres.length > 0 && (
          <div className="px-4 sm:px-6 mb-6 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
            <Link to={`/browse?type=${type}`} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!genreSlug ? 'bg-white text-dark-900' : 'bg-dark-700 text-white/55 hover:bg-dark-600 hover:text-white'}`}>
              Todos
            </Link>
            {genres.filter(g => g.count > 2).map(g => (
              <Link key={g.id} to={`/browse?type=${type}&genre=${g.slug}`} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${genreSlug === g.slug ? 'bg-white text-dark-900' : 'bg-dark-700 text-white/55 hover:bg-dark-600 hover:text-white'}`}>
                {g.name}
              </Link>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="px-4 sm:px-6">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {Array(28).fill(0).map((_, i) => <SeriesCardSkeleton key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {items.map(item => <SeriesCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function EmptyState({ query }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="text-5xl mb-4">🌸</div>
      <h3 className="text-lg font-bold text-white mb-2">Sin resultados</h3>
      <p className="text-white/40 text-sm max-w-xs">
        {query ? `No encontramos resultados para "${query}".` : 'No hay contenido en esta categoría.'}
      </p>
    </div>
  )
}
