import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [seriesOpen, setSeriesOpen] = useState(false)
  const searchRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    setMenuOpen(false)
    setSeriesOpen(false)
  }, [location.pathname, location.search])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setQuery('')
    }
  }

  const seriesLinks = [
    { to: '/browse?type=series', label: '🌸 Todas las Series' },
    { to: '/browse?type=series&genre=drama', label: '🇰🇷 K-Dramas' },
    { to: '/browse?type=series&genre=cdrama', label: '🇨🇳 C-Dramas' },
    { to: '/browse?type=series&genre=jdrama', label: '🇯🇵 J-Dramas' },
    { to: '/browse?type=series&genre=reality', label: '📺 Reality Shows' },
  ]

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-dark-900/98 backdrop-blur-lg border-b border-white/5 shadow-xl shadow-black/40' : 'bg-gradient-to-b from-black/90 to-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-900/50">
            <span className="text-base">🌸</span>
          </div>
          <span className="text-xl font-bold text-white hidden sm:block tracking-tight">
            Tu<span className="text-gradient">Dorama</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" label="Inicio" location={location} />
          <NavLink to="/browse?type=series" label="En Emisión" location={location} />

          {/* Series Dropdown */}
          <div className="relative" onMouseEnter={() => setSeriesOpen(true)} onMouseLeave={() => setSeriesOpen(false)}>
            <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors">
              Series
              <ChevronDown />
            </button>
            {seriesOpen && (
              <div className="absolute top-full left-0 mt-1 py-2 w-48 bg-dark-800/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/60 animate-fade-in">
                {seriesLinks.map(link => (
                  <Link key={link.to} to={link.to} className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <NavLink to="/browse?type=movies" label="Películas" location={location} />
          <NavLink to="/browse?type=series&genre=romance" label="Romance" location={location} />
          <NavLink to="/browse?type=series&genre=comedia" label="Comedia" location={location} />
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar doramas..."
                className="bg-dark-700 border border-white/15 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-brand-primary/60 w-52 sm:w-64 transition-all"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="text-white/50 hover:text-white p-2 transition-colors">
                <XIcon />
              </button>
            </form>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="text-white/60 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/8">
              <SearchIcon />
            </button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white/60 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/8">
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-dark-800/98 backdrop-blur-xl border-t border-white/8 animate-fade-in">
          <div className="py-2">
            <MobileLink to="/" label="🏠 Inicio" />
            <MobileLink to="/browse?type=series" label="📡 En Emisión" />
            <div className="px-4 pt-3 pb-1 text-xs font-semibold text-white/30 uppercase tracking-wider">Series</div>
            {seriesLinks.map(l => <MobileLink key={l.to} to={l.to} label={l.label} />)}
            <div className="border-t border-white/8 mt-2 pt-2">
              <MobileLink to="/browse?type=movies" label="🎬 Películas" />
              <MobileLink to="/browse?type=series&genre=romance" label="💕 Romance" />
              <MobileLink to="/browse?type=series&genre=comedia" label="😄 Comedia" />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function NavLink({ to, label, location }) {
  const active = location.pathname + location.search === to || (to === '/' && location.pathname === '/' && !location.search)
  return (
    <Link to={to} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
      {label}
    </Link>
  )
}

function MobileLink({ to, label }) {
  return (
    <Link to={to} className="block px-5 py-2.5 text-sm text-white/75 hover:text-white hover:bg-white/5 transition-colors">
      {label}
    </Link>
  )
}

function SearchIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}
function XIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
}
function MenuIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
}
function ChevronDown() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
}
