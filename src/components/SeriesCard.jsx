import { Link } from 'react-router-dom'
import { proxyImg } from '../api/tudorama'

export default function SeriesCard({ item }) {
  const to = item.type === 'movie' ? `/pelicula/${item.slug}` : `/serie/${item.slug}`

  return (
    <Link to={to} className="group block">
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-dark-700 mb-2 shadow-md">
        {item.poster ? (
          <img
            src={proxyImg(item.poster)}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-dark-600">
            <FilmIcon />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300" />

        {/* Play on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>

        {/* Movie badge */}
        {item.type === 'movie' && (
          <div className="absolute top-2 left-2 bg-brand-accent/90 rounded-md px-2 py-0.5 text-xs font-bold text-white uppercase">
            Película
          </div>
        )}

        {/* Genre badge */}
        {item.genres?.[0] && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5 text-xs text-white/80 max-w-[80%] truncate">
            {item.genres[0]}
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="text-sm font-medium text-white/85 group-hover:text-white transition-colors line-clamp-2 leading-snug">
        {item.title}
      </h3>
      {item.year && <p className="text-xs text-white/35 mt-0.5">{item.year}</p>}
    </Link>
  )
}

export function SeriesCardSkeleton() {
  return (
    <div>
      <div className="aspect-[2/3] rounded-xl skeleton mb-2" />
      <div className="h-3 skeleton rounded w-4/5 mb-1.5" />
      <div className="h-3 skeleton rounded w-2/5" />
    </div>
  )
}

function FilmIcon() {
  return (
    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/20">
      <rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/>
      <line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/>
    </svg>
  )
}
