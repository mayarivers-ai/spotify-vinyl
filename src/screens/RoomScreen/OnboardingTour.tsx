import { useState } from 'react'
import React from 'react'
import { useI18n } from '../../i18n'

const STORAGE_KEY = 'vinyl_onboarding_done'

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function markOnboardingDone() {
  localStorage.setItem(STORAGE_KEY, 'true')
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step {
  title: string
  body: string
  box: React.CSSProperties
  arrowDir?: 'up' | 'down' | 'left' | 'right'
}

// Steps are built dynamically inside the component using translations

// ─── Arrow SVG ────────────────────────────────────────────────────────────────

function Arrow({ dir }: { dir: 'up' | 'down' | 'left' | 'right' }) {
  const rotation = { up: 0, down: 180, left: 270, right: 90 }[dir]
  return (
    <svg
      width="20" height="28"
      viewBox="0 0 20 28"
      fill="none"
      style={{
        position: 'absolute',
        ...(dir === 'down' && { bottom: '-28px', left: '50%', transform: 'translateX(-50%)' }),
        ...(dir === 'up'   && { top:    '-28px', left: '50%', transform: 'translateX(-50%)' }),
        ...(dir === 'right'&& { right:  '-28px', top:  '50%', transform: 'translateY(-50%)' }),
        ...(dir === 'left' && { left:   '-28px', top:  '50%', transform: 'translateY(-50%)' }),
        transform: `${dir === 'down' ? 'translateX(-50%)' : dir === 'up' ? 'translateX(-50%)' : 'translateY(-50%)'} rotate(${rotation}deg)`,
        transformOrigin: 'center',
        opacity: 0.55,
      }}
    >
      <line x1="10" y1="0" x2="10" y2="22" stroke="#c8a96e" strokeWidth="1.5" strokeDasharray="3 3" />
      <polyline points="4,16 10,26 16,16" stroke="#c8a96e" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onDone: () => void
}

export function OnboardingTour({ onDone }: Props) {
  const { t } = useI18n()
  const STEPS: Step[] = [
    { title: t.ob1Title, body: t.ob1Body, box: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } },
    { title: t.ob2Title, body: t.ob2Body, box: { position: 'fixed', top: '38%', left: '26%', transform: 'translateX(-50%)' }, arrowDir: 'down' },
    { title: t.ob3Title, body: t.ob3Body, box: { position: 'fixed', top: '38%', right: '6%' }, arrowDir: 'down' },
    { title: t.ob4Title, body: t.ob4Body, box: { position: 'fixed', bottom: '12%', left: '50%', transform: 'translateX(-50%)' } },
  ]
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      markOnboardingDone()
      onDone()
    } else {
      setStep(s => s + 1)
    }
  }

  const handleSkip = () => {
    markOnboardingDone()
    onDone()
  }

  const MONO = 'Courier New, monospace'

  return (
    <>
      {/* Full-screen dim backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(1px)',
      }} />

      {/* Tooltip card */}
      <div style={{
        position: 'fixed', zIndex: 81,
        ...current.box,
        width: '300px',
        background: 'rgba(13,11,8,0.96)',
        border: '1px solid rgba(200,169,110,0.3)',
        padding: '1.4rem 1.6rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      }}>
        {/* Step indicator */}
        <div style={{
          display: 'flex', gap: '5px',
          marginBottom: '1rem',
        }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: '2px',
              flex: 1,
              background: i <= step
                ? 'rgba(200,169,110,0.8)'
                : 'rgba(232,224,212,0.15)',
              transition: 'background 300ms',
            }} />
          ))}
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: 'Georgia, serif',
          fontWeight: 400,
          fontSize: '1rem',
          color: 'var(--color-text)',
          margin: '0 0 0.7rem',
          letterSpacing: '0.04em',
        }}>
          {current.title}
        </h3>

        {/* Body */}
        <p style={{
          fontFamily: MONO,
          fontSize: '0.65rem',
          color: 'rgba(232,224,212,0.6)',
          letterSpacing: '0.05em',
          lineHeight: 1.9,
          margin: '0 0 1.2rem',
        }}>
          {current.body}
        </p>

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            onClick={handleSkip}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: MONO, fontSize: '0.58rem',
              color: 'rgba(232,224,212,0.25)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: 0, transition: 'color 200ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(232,224,212,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,224,212,0.25)')}
          >
            {t.skip}
          </button>

          <button
            onClick={handleNext}
            style={{
              background: 'none',
              border: '1px solid rgba(200,169,110,0.5)',
              color: 'rgba(200,169,110,0.9)',
              fontFamily: MONO, fontSize: '0.62rem',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              padding: '0.5rem 1.4rem',
              cursor: 'pointer',
              transition: 'border-color 200ms, color 200ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(200,169,110,0.9)'
              e.currentTarget.style.color = '#c8a96e'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(200,169,110,0.5)'
              e.currentTarget.style.color = 'rgba(200,169,110,0.9)'
            }}
          >
            {isLast ? t.start : t.next}
          </button>
        </div>

        {/* Arrow pointer */}
        {current.arrowDir && <Arrow dir={current.arrowDir} />}
      </div>
    </>
  )
}
