import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useVinylStore } from './store/useVinylStore'
import { getStoredToken, handleCallback } from './modules/spotify/SpotifyAuth'
import { initiateLogin } from './modules/spotify/SpotifyAuth'
import { RoomScreen } from './screens/RoomScreen/RoomScreen'

function LoginScreen() {
  const [entering, setEntering] = useState(false)

  const handleEnter = () => {
    if (entering) return
    setEntering(true)
    // Let the "enter" animation play before redirecting to Spotify
    setTimeout(() => initiateLogin(), 1400)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      {/* Blurry room background */}
      <div style={{
        position: 'absolute',
        inset: '-30px',
        backgroundImage: 'url(/room/room-full.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
        filter: entering ? 'blur(0px)' : 'blur(10px)',
        transform: entering ? 'scale(1.12)' : 'scale(1.05)',
        transition: 'filter 1.4s ease-in-out, transform 1.4s ease-in-out',
      }} />

      {/* Dark overlay — lifts as you enter */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: entering ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.62)',
        transition: 'background 1.4s ease-in-out',
      }} />

      {/* UI — fades out as you enter */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '1.2rem',
        opacity: entering ? 0 : 1,
        transition: 'opacity 0.8s ease-in-out',
        pointerEvents: entering ? 'none' : 'all',
      }}>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontWeight: 400,
          fontSize: '2.2rem',
          color: 'var(--color-text)',
          letterSpacing: '0.06em',
          margin: 0,
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          The Vinyl Room
        </h1>
        <p style={{
          fontFamily: 'Courier New, monospace',
          fontSize: '0.68rem',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          margin: 0,
          textShadow: '0 1px 10px rgba(0,0,0,0.8)',
        }}>
          Escucha como se escuchaba antes
        </p>
        <button
          onClick={handleEnter}
          style={{
            marginTop: '0.8rem',
            background: 'none',
            border: '1px solid rgba(232, 224, 212, 0.5)',
            color: 'var(--color-text)',
            fontFamily: 'Courier New, monospace',
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            padding: '0.75rem 2.5rem',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'border-color 200ms ease-in-out, color 200ms ease-in-out',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(200,169,110,0.8)'
            ;(e.target as HTMLButtonElement).style.color = 'var(--color-accent)'
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(232,224,212,0.5)'
            ;(e.target as HTMLButtonElement).style.color = 'var(--color-text)'
          }}
        >
          Entrar
        </button>
      </div>
    </div>
  )
}

function CallbackHandler() {
  const navigate = useNavigate()
  const setToken = useVinylStore((s) => s.setToken)
  const initEngines = useVinylStore((s) => s.initEngines)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')

    if (errorParam) {
      setError(`Spotify rechazó el acceso: ${errorParam}`)
      return
    }
    if (!code) {
      setError('No se recibió código de autorización')
      return
    }

    handleCallback(code)
      .then((token) => {
        setToken(token)
        initEngines()
        navigate('/room', { replace: true })
      })
      .catch((e: Error) => setError(e.message))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const baseStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    fontFamily: 'Courier New, monospace',
    fontSize: '0.8rem',
  }

  if (error) {
    return (
      <div style={{ ...baseStyle, color: '#c0392b' }}>
        <span>Error: {error}</span>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: '1px solid #c0392b', color: '#c0392b', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div style={{ ...baseStyle, color: 'var(--color-text-dim)' }}>
      Autenticando...
    </div>
  )
}

function AppInit({ children }: { children: React.ReactNode }) {
  const setToken = useVinylStore((s) => s.setToken)
  const initEngines = useVinylStore((s) => s.initEngines)
  const spotifyToken = useVinylStore((s) => s.spotifyToken)

  useEffect(() => {
    if (!spotifyToken) {
      const stored = getStoredToken()
      if (stored) {
        setToken(stored)
        initEngines()
      }
    }
  }, [spotifyToken, setToken, initEngines])

  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const spotifyToken = useVinylStore((s) => s.spotifyToken)
  if (!spotifyToken) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit>
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/callback" element={<CallbackHandler />} />
          <Route
            path="/room"
            element={<ProtectedRoute><RoomScreen /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppInit>
    </BrowserRouter>
  )
}
