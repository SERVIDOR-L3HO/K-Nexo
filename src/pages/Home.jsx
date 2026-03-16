import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import HeroSection from '../components/HeroSection'
import ContentRow from '../components/ContentRow'
import { getHome } from '../api/tudorama'

const GENRE_LINKS = [
  { to: '/browse?type=series', label: 'K-Dramas', emoji: '🇰🇷' },
  { to: '/browse?type=series&genre=cdrama', label: 'C-Dramas', emoji: '🇨🇳' },
  { to: '/browse?type=series&genre=jdrama', label: 'J-Dramas', emoji: '🇯🇵' },
  { to: '/browse?type=movies', label: 'Películas', emoji: '🎬' },
  { to: '/browse?type=series&genre=comedia', label: 'Comedia', emoji: '😄' },
  { to: '/browse?type=series&genre=romance', label: 'Romance', emoji: '💕' },
  { to: '/browse?type=series&genre=drama', label: 'Drama', emoji: '🎭' },
]

export default function Home() {
  const [data, setData] = useState({ recientes: [], populares: [], movies: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHome().then(d => {
      setData(d)
      setLoading(false)
    })
  }, [])

  return (
    <main className="min-h-screen">
      <HeroSection items={data.recientes} />

      {/* Genre quick links */}
      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {GENRE_LINKS.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-dark-700 hover:bg-dark-600 border border-white/5 hover:border-white/12 transition-all group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{item.emoji}</span>
              <span className="text-xs font-medium text-white/60 group-hover:text-white text-center leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="pb-16">
        <ContentRow
          title="Recién Agregados"
          emoji="✨"
          items={data.recientes}
          loading={loading}
          viewAllLink="/browse?type=series"
        />
        <ContentRow
          title="Actualizados Recientemente"
          emoji="🔄"
          items={data.populares}
          loading={loading}
          viewAllLink="/browse?type=series"
          badge="Nueva temporada"
        />
        <ContentRow
          title="Películas"
          emoji="🎬"
          items={data.movies}
          loading={loading}
          viewAllLink="/browse?type=movies"
        />
      </div>

      {/* CTA */}
      <div className="mx-4 sm:mx-6 mb-16 rounded-2xl overflow-hidden border border-white/8 bg-dark-700 relative">
        <div className="absolute inset-0 bg-brand-gradient opacity-8" />
        <div className="relative px-8 py-10 text-center">
          <h2 className="text-xl font-bold text-white mb-2">🌸 Todos tus doramas favoritos</h2>
          <p className="text-white/45 text-sm mb-5 max-w-sm mx-auto">
            K-Dramas, C-Dramas, J-Dramas y más. Subtitulados y doblados en Español Latino.
          </p>
          <Link to="/browse?type=series" className="inline-flex items-center gap-2 bg-white text-dark-900 font-bold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all text-sm">
            Explorar todo →
          </Link>
        </div>
      </div>
    </main>
  )
}
