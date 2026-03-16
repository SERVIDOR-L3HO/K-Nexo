import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Browse from './pages/Browse'
import Detail from './pages/Detail'
import Player from './pages/Player'

function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-white/5 py-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <img src="/knexo-logo.png" alt="K-Nexo" className="h-8 w-auto" />
            </div>
            <p className="text-white/30 text-xs">Doramas online gratis — K-Dramas, C-Dramas, J-Dramas en Español.</p>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs">Hecho por</span>
              <img src="/l3ho-logo.png" alt="L3HO Interactive" className="h-7 w-auto opacity-70 hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-white/25">
              <span>© 2026 K-Nexo</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const location = useLocation()
  const isPlayer = location.pathname === '/player'

  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      {!isPlayer && <Navbar />}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/serie/:slug" element={<Detail type="serie" />} />
          <Route path="/pelicula/:slug" element={<Detail type="movie" />} />
          <Route path="/player" element={<Player />} />
        </Routes>
      </div>
      {!isPlayer && <Footer />}
    </div>
  )
}
