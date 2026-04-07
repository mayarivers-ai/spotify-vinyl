import { useEffect, useRef, useCallback, useState } from 'react'
import type { RoomView, RoomNavState } from './useRoomNavigation'
import { ZONE_FOCUS } from './useRoomNavigation'
import styles from './RoomCanvas.module.css'

const IMAGE_PATHS: Record<RoomView, string> = {
  full:      '/room/room-full.png',
  shelf:     '/room/room-shelf.png',
  turntable: '/room/room-turntable.png',
}

// Placeholder colors when assets don't exist yet
const PLACEHOLDER_COLORS: Record<RoomView, string> = {
  full:      '#1a1008',
  shelf:     '#0f0c06',
  turntable: '#0c0f12',
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: RoomView,
  alpha: number
) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = PLACEHOLDER_COLORS[view]
  ctx.fillRect(0, 0, w, h)

  // Minimal room sketch
  ctx.globalAlpha = alpha * 0.15
  ctx.fillStyle = '#c8a96e'

  if (view === 'full') {
    // Floor line
    ctx.fillRect(0, h * 0.65, w, 2)
    // Left shelf blob
    ctx.fillRect(w * 0.05, h * 0.2, w * 0.2, h * 0.45)
    // Right turntable blob
    ctx.fillRect(w * 0.72, h * 0.4, w * 0.2, h * 0.2)
    // Center couch
    ctx.fillRect(w * 0.35, h * 0.5, w * 0.3, h * 0.15)
  } else if (view === 'shelf') {
    // Shelf planks
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(w * 0.05, h * (0.15 + i * 0.18), w * 0.9, 3)
      // Record spines
      for (let j = 0; j < 12; j++) {
        ctx.fillStyle = `hsl(${(i * 40 + j * 17) % 360}, 30%, 35%)`
        ctx.fillRect(w * (0.07 + j * 0.075), h * (0.17 + i * 0.18), w * 0.06, h * 0.14)
        ctx.fillStyle = '#c8a96e'
      }
    }
  } else {
    // Turntable platter
    ctx.beginPath()
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.28, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = PLACEHOLDER_COLORS[view]
    ctx.beginPath()
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }

  // Label
  ctx.globalAlpha = alpha * 0.25
  ctx.fillStyle = '#e8e0d4'
  ctx.font = `${Math.floor(h * 0.06)}px "Courier New"`
  ctx.textAlign = 'center'
  ctx.fillText(
    view === 'full' ? 'SALA' : view === 'shelf' ? 'ESTANTERÍA' : 'TOCADISCOS',
    w * 0.5, h * 0.92
  )

  ctx.globalAlpha = 1
}

interface Props {
  nav: RoomNavState
  onClick: (view: RoomView) => void
}

export function RoomCanvas({ nav, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const images = useRef<Map<RoomView, HTMLImageElement | null>>(new Map())
  const frameRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)

  // Preload all images — trigger re-render on each load
  useEffect(() => {
    const views: RoomView[] = ['full', 'shelf', 'turntable']
    views.forEach((view) => {
      const img = new Image()
      img.src = IMAGE_PATHS[view]
      img.onload = () => {
        images.current.set(view, img)
        setLoadedCount((n) => n + 1)
      }
      img.onerror = () => {
        images.current.set(view, null)
        setLoadedCount((n) => n + 1)
      }
    })
  }, [])

  const getSize = () => {
    const canvas = canvasRef.current
    if (!canvas) return { w: 0, h: 0 }
    return { w: canvas.width, h: canvas.height }
  }

  const drawView = useCallback((
    ctx: CanvasRenderingContext2D,
    view: RoomView,
    alpha: number,
    scaleX: number,
    scaleY: number,
    pivotX: number,
    pivotY: number,
  ) => {
    const { w, h } = getSize()
    const img = images.current.get(view) ?? null

    const sw = w * scaleX
    const sh = h * scaleY
    const dx = pivotX - (pivotX / w) * sw
    const dy = pivotY - (pivotY / h) * sh

    if (img) {
      ctx.globalAlpha = alpha
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, dx, dy, sw, sh)
    } else {
      // Placeholder: draw with transform
      ctx.save()
      ctx.translate(dx, dy)
      ctx.scale(scaleX, scaleY)
      drawPlaceholder(ctx, w, h, view, alpha)
      ctx.restore()
    }
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w, h } = getSize()
    ctx.clearRect(0, 0, w, h)

    const { fromView, view, animating, easedProgress } = nav

    if (!animating || fromView === view) {
      // Static: draw current view
      drawView(ctx, view, 1, 1, 1, w * 0.5, h * 0.5)
    } else {
      const t = easedProgress
      const focus = ZONE_FOCUS[view]
      const pivotX = focus.x * w
      const pivotY = focus.y * h

      // FROM image: zoom in toward destination, fade out
      const fromScale = 1 + t * 0.18
      drawView(ctx, fromView, 1 - t, fromScale, fromScale, pivotX, pivotY)

      // TO image: arrive slightly zoomed, settle to 1x, fade in
      const toScale = 1.12 - t * 0.12
      drawView(ctx, view, t, toScale, toScale, w * 0.5, h * 0.5)
    }

    ctx.globalAlpha = 1

    // Vignette
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.45)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    frameRef.current++
  }, [nav, drawView])

  // Re-render when nav changes OR when images finish loading
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => { render() })
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [render, loadedCount])

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      render()
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [render])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (nav.animating) return

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width   // 0-1
    // const y = (e.clientY - rect.top) / rect.height

    if (nav.view === 'full') {
      if (x < 0.38) onClick('shelf')
      else if (x > 0.58) onClick('turntable')
    }
  }, [nav, onClick])

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      onClick={handleClick}
    />
  )
}
