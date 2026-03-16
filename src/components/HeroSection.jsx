import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { proxyImg } from '../api/tudorama'

export default function HeroSection({ items = [] }) {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()
  const featured = items.slice(0, 6)

  useEffect(() => {
    if (featured.length < 2) return
    const timer = setInterval(() => setCurrent(c => (c + 1) % featured.length), 7000)
    return () => clearInterval(timer)
  }, [featured.length])

  if (!featured.length) return <HeroSkeleton />

  const item = featured[current]
  const bg = item.backdrop || item.poster

  return (
    <div className="relative h-[72vh] min-h-[500px] max-h-[720px] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {bg && (
          <img key={item.id} src={proxyImg(bg)} alt="" className="w-full h-full object-cover animate-fade-in" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-900/80 to-dark-900/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-dark-900/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-6 sm:px-12 max-w-2xl">
        <div className="animate-slide-up">
          {/* Tags */}
          <div className="flex items-center flex-wrap gap-2 mb-3">
            {item.genres?.slice(0, 2).map(g => (
              <span key={g} className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/80">
                {g}
              </span>
            ))}
            {item.year && (
              <span className="text-xs font-semibold text-white/50">{item.year}</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3 drop-shadow-xl">
            {item.title?.length > 55 ? item.title.slice(0, 55) + '…' : item.title}
          </h1>

          {/* Synopsis */}
          {item.excerpt && (
            <p className="text-white/60 text-sm sm:text-base mb-5 max-w-lg leading-relaxed line-clamp-2">
              {item.excerpt}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(item.type === 'movie' ? `/pelicula/${item.slug}` : `/serie/${item.slug}`)}
              className="flex items-center gap-2 bg-white text-dark-900 font-bold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all text-sm shadow-lg"
            >
              <PlayIcon />
              Ver Ahora
            </button>
            <button
              onClick={() => navigate(item.type === 'movie' ? `/pelicula/${item.slug}` : `/serie/${item.slug}`)}
              className="flex items-center gap-2 bg-white/12 backdrop-blur-sm text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-white/22 transition-all border border-white/20 text-sm"
            >
              <InfoIcon />
              Más Info
            </button>
          </div>
        </div>
      </div>

      {/* Dots */}
      {featured.length > 1 && (
        <div className="absolute bottom-5 left-6 sm:left-12 flex gap-2 z-10">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1 rounded-full transition-all duration-500 ${i === current ? 'bg-white w-8' : 'bg-white/25 w-4 hover:bg-white/50'}`}
            />
          ))}
        </div>
      )}

      {/* Side poster stack (desktop) */}
      {featured.length > 1 && (
        <div className="absolute right-8 bottom-12 hidden xl:flex flex-col gap-2 z-10">
          {featured.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setCurrent(i)}
              className={`w-14 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 ${i === current ? 'border-white scale-105 opacity-100' : 'border-transparent opacity-35 hover:opacity-60'}`}
            >
              <img src={proxyImg(v.poster || v.backdrop)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div className="relative h-[72vh] min-h-[500px] max-h-[720px] bg-dark-800">
      <div className="absolute inset-0 skeleton opacity-30" />
      <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-12">
        <div className="flex gap-2 mb-3">
          <div className="h-6 w-20 skeleton rounded-full" />
          <div className="h-6 w-16 skeleton rounded-full" />
        </div>
        <div className="h-12 w-2/3 skeleton rounded-xl mb-2" />
        <div className="h-12 w-1/2 skeleton rounded-xl mb-5" />
        <div className="h-4 w-3/5 skeleton rounded mb-2" />
        <div className="h-4 w-2/5 skeleton rounded mb-5" />
        <div className="flex gap-3">
          <div className="h-11 w-32 skeleton rounded-xl" />
          <div className="h-11 w-36 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function PlayIcon() {
  return <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
}
function InfoIcon() {
  return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
}
