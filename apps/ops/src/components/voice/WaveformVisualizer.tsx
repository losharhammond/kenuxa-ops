'use client'

import { useEffect, useRef } from 'react'
import type { VoiceState }   from '@/types/ops'

interface Props {
  voiceState: VoiceState
  barCount?:  number
}

export function WaveformVisualizer({ voiceState, barCount = 32 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const barsRef   = useRef<number[]>(Array.from({ length: barCount }, () => 0.1))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isActive = voiceState === 'listening' || voiceState === 'processing' || voiceState === 'speaking'

    function draw() {
      if (!canvas || !ctx) return
      const W = canvas.width
      const H = canvas.height

      ctx.clearRect(0, 0, W, H)

      const bars    = barsRef.current
      const barW    = W / barCount
      const padding = barW * 0.25
      const centerY = H / 2

      bars.forEach((h, i) => {
        // Animate each bar
        if (isActive) {
          const target = Math.random() * 0.8 + 0.1
          bars[i] = bars[i]! + (target - bars[i]!) * 0.15
        } else {
          bars[i] = bars[i]! + (0.08 - bars[i]!) * 0.08
        }

        const barH = (bars[i]!) * centerY * 1.8

        // Color by state
        const alpha = 0.6 + (bars[i]!) * 0.4
        let color: string
        if (voiceState === 'listening')  color = `rgba(16, 185, 129, ${alpha})`  // emerald
        else if (voiceState === 'processing') color = `rgba(99, 102, 241, ${alpha})` // indigo
        else if (voiceState === 'speaking')   color = `rgba(245, 158, 11, ${alpha})` // amber
        else                              color = `rgba(63, 63, 70, ${alpha})`    // zinc

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(
          i * barW + padding,
          centerY - barH / 2,
          barW - padding * 2,
          barH,
          2
        )
        ctx.fill()
      })

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [voiceState, barCount])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={64}
      className="w-full max-w-sm h-16"
    />
  )
}
