import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Browse from './pages/Browse'
import Detail from './pages/Detail'

function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-white/5 py-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">🌸</span>
              <span className="text-lg font-bold text-white">Tu<span className="text-gradient">Dorama</span></span>
            </div>
            <p className="text-white/30 text-xs">Doramas online gratis — K-Dramas, C-Dramas, J-Dramas en Español.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-white/25">
            <span>Contenido de TuDorama.com</span>
            <span>•</span>
            <span>© 2026 TuDorama</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/serie/:slug" element={<Detail type="serie" />} />
          <Route path="/pelicula/:slug" element={<Detail type="movie" />} />
        </Routes>
      </div>
      <Footer />
    </div>
  )
}
