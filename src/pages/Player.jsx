import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getEpisodeLinks } from '../api/tudorama'

const LANG_LABELS = {
  ko: 'SUB KO',
  es: 'LAT',
  en: 'SUB EN',
  zh: 'SUB ZH',
}

function getLangLabel(code) {
  return LANG_LABELS[code] || (code ? code.toUpperCase() : 'SUB')
}

function isLatino(code) {
  return code === 'es'
}

export default function Player() {
  const [params] = useSearchParams()
  const episodeId = params.get('id')
  const title = params.get('title') || 'Episodio'
  const serieTitle = params.get('serieTitle') || ''
  const serieSlug = params.get('serieSlug') || ''

  const [servers, setServers] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [langFilter, setLangFilter] = useState('all')
  const [iframeError, setIframeError] = useState(false)
  const [useProxy, setUseProxy] = useState(false)

  useEffect(() => {
    if (!episodeId) return
    setLoading(true)
    setError(null)
    setServers([])
    setActive(null)
    setIframeError(false)
    setUseProxy(false)

    getEpisodeLinks(episodeId)
      .then(data => {
        if (!data || !data.length) throw new Error('Sin servidores disponibles')
        setServers(data)
        // Prefer Latino, then any available
        const first = data.find(s => isLatino(s.languageCode)) || data[0]
        if (first) setActive(first)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [episodeId])

  const filtered = langFilter === 'all'
    ? servers
    : servers.filter(s => (langFilter === 'es' ? isLatino(s.languageCode) : !isLatino(s.languageCode)))

  // Build iframe URL: try embed directly, fallback to proxy
  const iframeSrc = (() => {
    if (!active) return null
    const src = active.embed || active.link
    if (!src) return null
    if (useProxy) return `/api/player-proxy?url=${encodeURIComponent(src)}`
    return src
  })()

  function handleServerClick(s) {
    setActive(s)
    setIframeError(false)
    setUseProxy(false)
  }

  function handleIframeError() {
    if (!useProxy) {
      // First try via proxy
      setUseProxy(true)
      setIframeError(false)
    } else {
      setIframeError(true)
    }
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-900 border-b border-white/8 z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {serieSlug ? (
            <Link to={`/serie/${serieSlug}`} className="text-white/50 hover:text-white transition-colors shrink-0 p-1">
              <BackIcon />
            </Link>
          ) : (
            <Link to="/" className="text-white/50 hover:text-white transition-colors shrink-0 p-1">
              <BackIcon />
            </Link>
          )}
          <div className="min-w-0">
            {serieTitle && <p className="text-white/40 text-xs truncate">{serieTitle}</p>}
            <h1 className="text-white text-sm font-semibold truncate">{title}</h1>
          </div>
        </div>
      </div>

      {/* Player area */}
      <div className="relative flex-1 bg-black min-h-0">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-white/15 border-t-white/80 rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Buscando servidores…</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="text-white/60 text-sm mb-1">{error}</p>
            <Link to={serieSlug ? `/serie/${serieSlug}` : '/'} className="btn-primary text-sm">
              Volver
            </Link>
          </div>
        ) : iframeError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-4xl">🔒</div>
            <p className="text-white/60 text-sm">Este servidor no permite reproducción integrada.</p>
            {active?.embed && (
              <a
                href={active.embed}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-dark-900 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-white/90 transition-colors"
              >
                Abrir en nueva pestaña ↗
              </a>
            )}
            <button
              onClick={() => { setIframeError(false); setUseProxy(false) }}
              className="text-white/40 text-xs underline"
            >
              Probar otro servidor
            </button>
          </div>
        ) : !iframeSrc ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="text-4xl">🎬</div>
            <p className="text-white/50 text-sm">Selecciona un servidor abajo</p>
          </div>
        ) : (
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
            scrolling="no"
            onError={handleIframeError}
          />
        )}
      </div>

      {/* Servers panel */}
      <div className="shrink-0 bg-dark-900 border-t border-white/8 overflow-y-auto" style={{ maxHeight: '180px' }}>
        <div className="max-w-4xl mx-auto px-4 py-5">

          {loading && (
            <div className="flex gap-2 flex-wrap">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-9 w-28 skeleton rounded-xl" />
              ))}
            </div>
          )}

          {!loading && servers.length > 0 && (
            <>
              {/* Language filter */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-white/35 text-xs font-medium">Idioma:</span>
                {[
                  { val: 'all', label: 'Todos' },
                  { val: 'es', label: '🇲🇽 Latino' },
                  { val: 'sub', label: '🇰🇷 Subtitulado' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setLangFilter(val)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      langFilter === val
                        ? 'bg-white text-dark-900'
                        : 'bg-dark-700 text-white/50 hover:bg-dark-600 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Server buttons */}
              <div className="flex flex-wrap gap-2">
                {filtered.map((s) => {
                  const isActive = active?.id === s.id
                  const langBadge = getLangLabel(s.languageCode)
                  const lat = isLatino(s.languageCode)
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleServerClick(s)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        isActive
                          ? 'bg-white text-dark-900 border-white shadow-lg scale-[1.02]'
                          : 'bg-dark-700 text-white/70 border-white/8 hover:bg-dark-600 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <ServerIcon active={isActive} />
                      <span>{s.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        lat
                          ? isActive ? 'bg-green-700 text-white' : 'bg-green-900/50 text-green-400'
                          : isActive ? 'bg-blue-700 text-white' : 'bg-blue-900/50 text-blue-300'
                      }`}>
                        {langBadge}
                      </span>
                    </button>
                  )
                })}
              </div>

              {filtered.length === 0 && (
                <p className="text-white/30 text-sm py-3">
                  No hay servidores disponibles para este idioma.
                </p>
              )}

              <p className="text-white/20 text-xs mt-5">
                Si un servidor no carga, prueba con otro. Los videos son servidos por doramasflix.in.
              </p>
            </>
          )}

          {!loading && servers.length === 0 && !error && (
            <div className="text-center py-8">
              <p className="text-white/40 text-sm mb-4">No se encontraron servidores para este episodio.</p>
              <Link
                to={serieSlug ? `/serie/${serieSlug}` : '/'}
                className="inline-flex items-center gap-2 bg-white text-dark-900 font-bold px-5 py-2.5 rounded-xl text-sm"
              >
                Volver
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  )
}
function ServerIcon({ active }) {
  return (
    <svg width="13" height="13" fill="none" stroke={active ? 'currentColor' : '#ffffff50'} strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="8" rx="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/>
      <line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  )
}
