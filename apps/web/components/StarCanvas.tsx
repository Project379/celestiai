'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  speed: number
}

interface StarCanvasProps {
  className?: string
  starCount?: number
}

export function StarCanvas({ className, starCount = 150 }: StarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let w = 0, h = 0

    // Handle DPR for crisp rendering on retina displays
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Generate stars using normalized [0,1] coords so they survive resize
    const stars: Star[] = []

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.5 + 0.1,
      })
    }

    // Animation loop
    let animationId: number
    let time = 0
    let paused = false

    const handleVisibility = () => {
      paused = document.hidden
      if (!paused) animationId = requestAnimationFrame(animate)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const animate = () => {
      if (paused) return
      time += 0.01
      ctx.clearRect(0, 0, w, h)

      // Draw stars with twinkling effect
      for (const star of stars) {
        const twinkle = Math.sin(time * star.speed * 3 + star.x * 1000) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`
        ctx.fill()
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('visibilitychange', handleVisibility)
      cancelAnimationFrame(animationId)
    }
  }, [starCount])

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'absolute inset-0'}
      aria-hidden="true"
    />
  )
}
