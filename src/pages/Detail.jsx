import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import SeriesCard, { SeriesCardSkeleton } from '../components/SeriesCard'
import { getSerieDetail, getMovieDetail, getEpisodes, getSeries, proxyImg } from '../api/tudorama'

export default function Detail({ type = 'serie' }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [epLoading, setEpLoading] = useState(false)
  const isMovie = type === 'movie'

  useEffect(() => {
    setLoading(true)
    setEpisodes([])
    window.scrollTo(0, 0)

    async function load() {
      const detail = isMovie ? await getMovieDetail(slug) : await getSerieDetail(slug)
      setItem(detail)
      setLoading(false)

      if (detail) {
        if (!isMovie) {
          setEpLoading(true)
          const eps = await getEpisodes(detail.id)
          setEpisodes(eps)
          setEpLoading(false)
        }
        const rel = await getSeries({ per_page: 12 })
        setRelated(rel.filter(r => r.slug !== slug))
      }
    }
    load()
  }, [slug, type])

  if (loading) return <DetailSkeleton />
  if (!item) return <NotFound />

  return (
    <main className="min-h-screen pt-16 pb-16 bg-dark-900">
      {/* Backdrop header */}
      <div className="relative h-72 sm:h-96 overflow-hidden">
        {(item.backdrop || item.poster) && (
          <img src={proxyImg(item.backdrop || item.poster)} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/70 to-dark-900/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900/80 to-transparent" />
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-32 relative z-10">
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          {/* Poster */}
          {item.poster && (
            <div className="w-36 sm:w-48 shrink-0">
              <img
                src={proxyImg(item.poster)}
                alt={item.title}
                className="w-full aspect-[2/3] object-cover rounded-2xl shadow-2xl shadow-black/60"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 pt-2 sm:pt-20">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {isMovie && (
                <span className="badge bg-brand-accent/20 text-brand-accent border border-brand-accent/30">Película</span>
              )}
              {item.genres?.map(g => (
                <span key={g} className="badge bg-dark-600 text-white/60 border border-white/10">{g}</span>
              ))}
              {item.year && <span className="text-white/40 text-sm">{item.year}</span>}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">{item.title}</h1>

            {item.excerpt && (
              <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4 max-w-2xl">{item.excerpt}</p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-white/40 mb-5">
              {item.director && <span><span className="text-white/25">Director:</span> {item.director}</span>}
              {item.cast && <span><span className="text-white/25">Reparto:</span> {item.cast.slice(0, 60)}{item.cast.length > 60 ? '…' : ''}</span>}
            </div>

            {/* CTA */}
            {episodes.length > 0 && (
              <button
                onClick={() => {
                  const ep = episodes[0]
                  const q = new URLSearchParams({
                    id: ep.id,
                    link: ep.link,
                    title: ep.title,
                    serieTitle: item.title,
                    serieSlug: slug,
                  })
                  navigate(`/player?${q}`)
                }}
                className="inline-flex items-center gap-2 bg-white text-dark-900 font-bold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all text-sm shadow-lg"
              >
                <PlayIcon />
                Ver Episodio 1
              </button>
            )}
            {isMovie && item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-dark-900 font-bold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all text-sm shadow-lg"
              >
                <PlayIcon />
                Ver Película
              </a>
            )}
          </div>
        </div>

        {/* Episodes */}
        {!isMovie && (
          <div className="mb-12">
            <h2 className="text-lg font-bold text-white mb-4">
              Episodios {episodes.length > 0 && <span className="text-white/30 font-normal text-base">({episodes.length})</span>}
            </h2>
            {epLoading ? (
              <div className="space-y-2">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-16 skeleton rounded-xl" />
                ))}
              </div>
            ) : episodes.length === 0 ? (
              <p className="text-white/30 text-sm py-4">No hay episodios disponibles aún.</p>
            ) : (
              <div className="grid gap-2">
                {episodes.map((ep, i) => {
                  const q = new URLSearchParams({
                    id: ep.id,
                    link: ep.link,
                    title: ep.title,
                    serieTitle: item.title,
                    serieSlug: slug,
                  })
                  return (
                    <Link
                      key={ep.id}
                      to={`/player?${q}`}
                      className="flex items-center gap-4 p-4 rounded-xl bg-dark-700 hover:bg-dark-600 border border-white/5 hover:border-white/12 transition-all group"
                    >
                      {ep.thumbnail ? (
                        <div className="relative w-20 h-14 shrink-0">
                          <img src={proxyImg(ep.thumbnail)} alt="" className="w-full h-full rounded-lg object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 group-hover:bg-black/40 transition-all">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <PlayFill />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-14 rounded-lg bg-dark-600 shrink-0 flex items-center justify-center">
                          <span className="text-white/20 font-bold text-lg">{i + 1}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium line-clamp-1">{ep.title}</p>
                        {ep.excerpt && <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{ep.excerpt}</p>}
                      </div>
                      <div className="shrink-0 text-white/30 group-hover:text-white/70 transition-colors">
                        <PlayIcon />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">También te puede gustar</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {related.slice(0, 12).map(r => <SeriesCard key={r.id} item={r} />)}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen pt-16">
      <div className="h-72 bg-dark-800 skeleton" />
      <div className="max-w-7xl mx-auto px-6 -mt-32 relative z-10">
        <div className="flex gap-6 mb-8">
          <div className="w-48 aspect-[2/3] skeleton rounded-2xl shrink-0" />
          <div className="flex-1 pt-20">
            <div className="h-6 skeleton rounded w-1/3 mb-3" />
            <div className="h-8 skeleton rounded w-2/3 mb-2" />
            <div className="h-4 skeleton rounded w-full mb-2" />
            <div className="h-4 skeleton rounded w-4/5 mb-5" />
            <div className="h-11 skeleton rounded-xl w-36" />
          </div>
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center text-center px-6">
      <div className="text-5xl mb-4">🌸</div>
      <h2 className="text-xl font-bold text-white mb-2">No encontrado</h2>
      <p className="text-white/40 text-sm mb-6">Este dorama no existe o fue eliminado.</p>
      <Link to="/" className="btn-primary text-sm">Volver al inicio</Link>
    </div>
  )
}

function PlayIcon() {
  return <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
}
function PlayFill() {
  return (
    <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
      <svg width="12" height="12" fill="#0d0d1a" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </div>
  )
}
