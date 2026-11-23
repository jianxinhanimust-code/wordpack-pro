import { useEffect, useRef } from 'react'

type Star = { angle: number; distance: number; delay: number; lifetime: number; radius: number; hue: string; ray: boolean }
const colors = ['#ffe7bf', '#e3bdff', '#b6e8ff', '#fff9e8']
const burstDuration = 1430

export function StarBurst() {
  const surface = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = surface.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const area = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6)
    const width = area.width
    const height = area.height
    const size = Math.min(width, height)
    if (!size) return
    canvas.width = Math.ceil(width * dpr)
    canvas.height = Math.ceil(height * dpr)
    ctx.scale(dpr, dpr)
    const stars: Star[] = Array.from({ length: width < 560 ? 33 : 52 }, (_, index) => ({
      angle: index * 2.39996 + Math.random() * .26,
      distance: size * (.13 + Math.random() * .56),
      delay: Math.random() * 220,
      lifetime: 560 + Math.random() * 610,
      radius: .65 + Math.random() * (index % 7 ? 1.45 : 3.7),
      hue: colors[index % colors.length],
      ray: index % 6 === 0,
    }))
    let frame = 0
    let started: number | undefined

    function render(now: number) {
      if (!ctx) return
      started ??= now
      const elapsed = now - started
      ctx.clearRect(0, 0, width, height)
      if (elapsed >= burstDuration) return
      for (const star of stars) {
        const age = (elapsed - star.delay) / star.lifetime
        if (age <= 0 || age >= 1) continue
        const travelled = (1 - (1 - age) ** 3) * star.distance
        const x = width * .5 + Math.cos(star.angle) * travelled
        const y = height * .54 + Math.sin(star.angle) * travelled * .67 - 32 * age
        const radius = star.radius * (1 - age * .48)
        ctx.globalAlpha = Math.min(age * 9, (1 - age) * 1.7)
        ctx.fillStyle = star.hue
        ctx.beginPath()
        if (star.ray) {
          ctx.moveTo(x, y - radius * 2.8)
          ctx.quadraticCurveTo(x + radius * .32, y - radius * .32, x + radius * 1.8, y)
          ctx.quadraticCurveTo(x + radius * .32, y + radius * .32, x, y + radius * 2.8)
          ctx.quadraticCurveTo(x - radius * .32, y + radius * .32, x - radius * 1.8, y)
          ctx.quadraticCurveTo(x - radius * .32, y - radius * .32, x, y - radius * 2.8)
        } else ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [])
  return <canvas ref={surface} className="pack-starburst" aria-hidden="true"/>
}
