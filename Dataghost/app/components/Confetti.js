'use client'
import { useEffect, useRef } from 'react'

export default function Confetti({ active, onDone }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      w: 8 + Math.random() * 8,
      h: 6 + Math.random() * 6,
      color: ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#FFFFFF', '#06B6D4'][Math.floor(Math.random() * 6)],
      speed: 3 + Math.random() * 4,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 6,
      drift: (Math.random() - 0.5) * 2,
      opacity: 1,
    }))

    let frame = 0
    let animId

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        p.y += p.speed
        p.x += p.drift
        p.angle += p.spin
        if (frame > 80) p.opacity -= 0.015
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate((p.angle * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      frame++
      if (frame < 140) animId = requestAnimationFrame(draw)
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); if (onDone) onDone() }
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [active])

  if (!active) return null

  return (
    <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }} />
  )
}