import { createContext, useContext, useState, useEffect } from 'react'
import React from 'react'

export type Lang = 'es' | 'en'
const STORAGE_KEY = 'vinyl_lang'

// ─── Translations ─────────────────────────────────────────────────────────────

export const T = {
  es: {
    // Login
    tagline:          'Escucha como se escuchaba antes',
    enter:            'Entrar',
    whatIsThis:       '¿qué es esto? —',
    closeInfo:        '— cerrar',
    onboardingDesc:   'Una sala de vinilos virtual conectada a tu Spotify. Pon un disco en el plato, escucha la cara A, dale la vuelta, escucha la cara B — como siempre fue.',
    needsTitle:       'Necesitas',
    need1:            '· Spotify Premium',
    need2:            '· Spotify abierto en algún dispositivo',
    need3:            '· Navegador de escritorio',
    // Mobile wall
    mobileText:       'Esta experiencia está diseñada para pantallas grandes.\n\nÁbrela desde tu ordenador para disfrutarla como se merece.',
    // Callback
    authenticating:   'Autenticando...',
    backToStart:      'Volver al inicio',
    // Room
    shelf:            'ESTANTERÍA',
    turntable:        'TOCADISCOS',
    backRoom:         '← SALA',
    // CoverFlow
    sortRecent:       'Reciente',
    sortYear:         'Año',
    sortArtist:       'Artista',
    sortName:         'Álbum',
    loadingLibrary:   'Cargando biblioteca...',
    tracks:           'pistas',
    // Album detail
    sideA:            '▶ CARA A',
    sideB:            '▶ CARA B',
    autoSplit:        'División automática',
    resolvingSides:   'Resolviendo caras...',
    droppingNeedle:   'BAJANDO AGUJA...',
    putOnDeck:        'PONER EN EL PLATO',
    // Turntable
    noDisc:           'Sin disco en el plato',
    side:             'CARA',
    flipToB:          '↺ CARA B',
    liftNeedle:       '◼ LEVANTAR AGUJA',
    droppingMsg:      'Bajando aguja...',
    liftingMsg:       'Levantando aguja...',
    pause:            'Pausar',
    resume:           'Reanudar',
    // Flip modal
    flipMessage:      'Dale la vuelta al disco',
    holdToConfirm:    'Mantener para confirmar',
    flipping:         'Girando...',
    // Onboarding
    ob1Title:         'Bienvenido a The Vinyl Room',
    ob1Body:          'Una sala de escucha virtual conectada a tu Spotify. Aquí escuchas álbumes completos, cara A y cara B, como con un vinilo de verdad.',
    ob2Title:         'La estantería',
    ob2Body:          'Aquí están tus álbumes guardados en Spotify. Navega entre ellos y haz clic en uno para verlo.',
    ob3Title:         'El tocadiscos',
    ob3Body:          'Cuando pongas un disco, lo verás girar aquí. Controla la reproducción, pausa, y cuando acabe la cara A te pedirá que le des la vuelta.',
    ob4Title:         'Antes de empezar',
    ob4Body:          'Necesitas Spotify Premium y Spotify abierto en cualquier dispositivo (móvil, ordenador, tablet). Ese dispositivo será el que reproduzca la música.',
    skip:             'Saltar',
    next:             'Siguiente →',
    start:            'Empezar →',
  },
  en: {
    tagline:          'Listen the way it used to be',
    enter:            'Enter',
    whatIsThis:       'what is this? —',
    closeInfo:        '— close',
    onboardingDesc:   'A virtual vinyl room connected to your Spotify. Put a record on the turntable, listen to side A, flip it, listen to side B — just like it always was.',
    needsTitle:       'You need',
    need1:            '· Spotify Premium',
    need2:            '· Spotify open on any device',
    need3:            '· A desktop browser',
    mobileText:       'This experience is designed for large screens.\n\nOpen it from your computer to enjoy it properly.',
    authenticating:   'Authenticating...',
    backToStart:      'Back to start',
    shelf:            'SHELF',
    turntable:        'TURNTABLE',
    backRoom:         '← ROOM',
    sortRecent:       'Recent',
    sortYear:         'Year',
    sortArtist:       'Artist',
    sortName:         'Album',
    loadingLibrary:   'Loading library...',
    tracks:           'tracks',
    sideA:            '▶ SIDE A',
    sideB:            '▶ SIDE B',
    autoSplit:        'Auto split — no A/B data found',
    resolvingSides:   'Resolving sides...',
    droppingNeedle:   'DROPPING NEEDLE...',
    putOnDeck:        'PUT ON THE DECK',
    noDisc:           'No record on the deck',
    side:             'SIDE',
    flipToB:          '↺ SIDE B',
    liftNeedle:       '◼ LIFT NEEDLE',
    droppingMsg:      'Dropping needle...',
    liftingMsg:       'Lifting needle...',
    pause:            'Pause',
    resume:           'Resume',
    flipMessage:      'Flip the record',
    holdToConfirm:    'Hold to confirm',
    flipping:         'Flipping...',
    ob1Title:         'Welcome to The Vinyl Room',
    ob1Body:          'A virtual listening room connected to your Spotify. Listen to full albums, side A and side B, just like with a real vinyl.',
    ob2Title:         'The shelf',
    ob2Body:          'Your saved Spotify albums live here. Browse through them and click one to inspect it.',
    ob3Title:         'The turntable',
    ob3Body:          'Once you put a record on, you\'ll see it spinning here. Control playback, pause, and when side A ends you\'ll be asked to flip it.',
    ob4Title:         'Before you start',
    ob4Body:          'You need Spotify Premium and Spotify open on any device (phone, computer, tablet). That device will play the music.',
    skip:             'Skip',
    next:             'Next →',
    start:            'Start →',
  },
} as const

export type Translations = Record<keyof typeof T.es, string>

// ─── Context ──────────────────────────────────────────────────────────────────

interface I18nCtx {
  lang: Lang
  t: Translations
  setLang: (l: Lang) => void
}

const I18nContext = createContext<I18nCtx>({
  lang: 'es',
  t: T.es,
  setLang: () => {},
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored === 'en' || stored === 'es') ? stored : 'es'
  })

  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, t: T[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

// ─── Language toggle button ───────────────────────────────────────────────────

interface LangToggleProps {
  style?: React.CSSProperties
}

export function LangToggle({ style }: LangToggleProps) {
  const { lang, setLang } = useI18n()
  const MONO = 'Courier New, monospace'

  return (
    <div style={{
      display: 'flex', gap: '2px', alignItems: 'center',
      ...style,
    }}>
      {(['es', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: MONO, fontSize: '0.6rem',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '0.2rem 0.4rem',
            color: lang === l
              ? 'rgba(200,169,110,0.9)'
              : 'rgba(232,224,212,0.25)',
            transition: 'color 200ms',
            borderBottom: lang === l
              ? '1px solid rgba(200,169,110,0.6)'
              : '1px solid transparent',
          }}
          onMouseEnter={e => {
            if (lang !== l) e.currentTarget.style.color = 'rgba(232,224,212,0.5)'
          }}
          onMouseLeave={e => {
            if (lang !== l) e.currentTarget.style.color = 'rgba(232,224,212,0.25)'
          }}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
