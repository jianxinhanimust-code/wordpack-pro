import { useEffect, useRef } from 'react'
import { effectColors } from '@/core/cardEffects'
import type { CardEffect } from '@/core/cardEffects'
import type { Rarity } from '@/core/cardArt'

const turn = 2 * Math.PI
const intensity: Record<Rarity, number> = { N: .58, R: .74, SR: .91, UR: 1 }
type Field = {
  ctx: CanvasRenderingContext2D; x: number; y: number; margin: number; time: number; power: number
  colors: typeof effectColors[CardEffect]
}

function lightStroke({ ctx, colors }: Field, width: number, alpha: number, color: string = colors.main) {
  ctx.strokeStyle = color
  ctx.lineWidth = width * 4
  ctx.globalAlpha = alpha * .19
  ctx.stroke()
  ctx.lineWidth = width
  ctx.globalAlpha = alpha
  ctx.stroke()
}

function tide(field: Field) {
  const { ctx, x, y, margin, time, power, colors } = field
  for (const side of [-1, 1]) {
    for (let band = 0; band < 3; band++) {
      ctx.beginPath()
      for (let i = 0; i <= 32; i++) {
        const length = i / 32
        const phase = length * 8.6 + side * time * 1.4 + band * .78
        const ripples = Math.sin(phase) * .31 + Math.sin(phase * 1.7 - time) * .14
        const px = side * (x + margin * (.31 + band * .19 + ripples))
        const py = (length * 2 - 1) * (y * .94) + Math.sin(phase) * 9
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      lightStroke(field, 1 + band * .42, power * (.82 - band * .13), [colors.glint, colors.main, colors.accent][band])
    }
    for (let i = 0; i < 6; i++) {
      const age = (time * .14 + i / 6) % 1
      const px = side * (x + margin * (.56 + .31 * Math.sin(i * 2 + time)))
      ctx.beginPath()
      ctx.arc(px, y * (1 - 2 * age), 1.3 + (i % 3) * .8, 0, turn)
      ctx.strokeStyle = colors.glint
      ctx.lineWidth = .75
      ctx.globalAlpha = power * Math.sin(age * Math.PI) * .57
      ctx.stroke()
    }
  }
}

function corona(field: Field) {
  const { ctx, x, y, margin, time, power, colors } = field
  for (let ring = 0; ring < 3; ring++) {
    const offset = time * (.25 - ring * .06) + ring * .8
    const rx = x + margin * (.44 + .2 * ring)
    const ry = y * (.8 + .06 * ring)
    for (const side of [0, Math.PI]) {
      ctx.beginPath()
      ctx.ellipse(0, 0, rx, ry, -.1 + ring * .12, offset + side - .82, offset + side + 1.69)
      lightStroke(field, ring === 0 ? 1.8 : 1, power * (.76 - ring * .15), [colors.glint, colors.main, colors.accent][ring])
    }
  }
  for (let i = 0; i < 28; i++) {
    const angle = i / 28 * turn + time * .14
    const flicker = .5 + Math.sin(i * 2.3 + time * 2) * .28
    const px = Math.cos(angle) * (x + margin * .68)
    const py = Math.sin(angle) * y * .82
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px + Math.cos(angle) * 8, py + Math.sin(angle) * 8)
    lightStroke(field, .85, power * flicker, colors.main)
  }
}

function electricity(field: Field) {
  const { ctx, x, y, margin, time, power, colors } = field
  for (const side of [-1, 1]) {
    for (let branch = 0; branch < 3; branch++) {
      const phase = time * 1.5 + branch * 1.9 + side
      const origin = (branch - 1) * y * .49 + Math.sin(phase) * 13
      ctx.beginPath()
      for (let i = 0; i < 7; i++) {
        const zigzag = .52 + .33 * Math.sin(i * 19.4 + branch * 1.2 + Math.sin(phase) * .6)
        const px = side * (x + margin * zigzag)
        const py = origin + i * y * .099 - y * .29
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
        if (i === 3) {
          ctx.lineTo(px + side * margin * .14, py - 12)
          ctx.moveTo(px, py)
        }
      }
      lightStroke(field, 1.1, power * (.62 + Math.sin(phase) * .24), branch === 1 ? colors.glint : colors.main)
    }
  }
}

function refraction(field: Field) {
  const { ctx, x, y, margin, time, power, colors } = field
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1
    const offset = i * 2.3999
    const px = side * (x + margin * (.42 + .29 * Math.sin(offset + time * .74)))
    const py = y * Math.sin(offset + time * .23)
    const size = 3 + i % 4 * 2.2
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(offset + time * .6)
    ctx.beginPath()
    ctx.moveTo(0, -size)
    ctx.lineTo(size * .45, 0)
    ctx.lineTo(-1, size * .8)
    ctx.lineTo(-size * .25, 0)
    ctx.closePath()
    ctx.fillStyle = i % 3 ? colors.main : colors.accent
    ctx.globalAlpha = power * .49
    ctx.fill()
    lightStroke(field, .67, power * .69, colors.glint)
    ctx.restore()
  }
}

function vapor(field: Field) {
  const { ctx, x, y, margin, time, power, colors } = field
  for (const side of [-1, 1]) {
    for (let band = 0; band < 4; band++) {
      const phase = time * .64 + band + side
      const baseline = y * (band / 1.7 - .89) + Math.sin(phase) * 15
      const gradient = ctx.createLinearGradient(side * (x - 14), 0, side * (x + margin), 0)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(.55, band % 2 ? colors.main : colors.accent)
      gradient.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.moveTo(side * (x - 20), baseline + 12)
      ctx.bezierCurveTo(side * (x + margin), baseline + 24 * Math.sin(phase),
        side * (x + margin * .78), baseline - 24, side * (x - 4), baseline - 15)
      ctx.strokeStyle = gradient
      ctx.lineWidth = 14 + band * 2
      ctx.globalAlpha = power * .17
      ctx.stroke()
      ctx.lineWidth = 4
      ctx.globalAlpha = power * .34
      ctx.stroke()
    }
  }
}

function driftingLights(field: Field, hot: boolean) {
  const { ctx, x, y, margin, time, power, colors } = field
  for (let i = 0; i < 30; i++) {
    const age = (time * (hot ? .19 : .09) * (.72 + i % 5 * .17) + i * .618) % 1
    const side = i % 2 ? 1 : -1
    const px = side * (x + margin * (.5 + .38 * Math.sin(i * 3 + age * 6)))
    const py = y * (1 - 2 * age)
    const radius = .7 + i % 5 * .3
    ctx.fillStyle = i % 3 ? colors.main : colors.accent
    ctx.globalAlpha = power * Math.sin(age * Math.PI) * .23
    ctx.beginPath()
    ctx.arc(px, py, radius * 3, 0, turn)
    ctx.fill()
    ctx.globalAlpha *= 3
    ctx.fillStyle = i % 2 ? colors.glint : colors.main
    ctx.beginPath()
    ctx.ellipse(px, py, radius, radius * (hot ? 2.7 : 1), hot ? side * .43 : 0, 0, turn)
    ctx.fill()
  }
}

function frostBloom(field: Field) {
  const { ctx, x, y, margin, time, power, colors } = field
  for (const side of [-1, 1]) {
    for (let crystal = 0; crystal < 7; crystal++) {
      const age = (time * .24 + crystal * .37 + (side === 1 ? .21 : 0)) % 1
      const reach = margin * (.48 + crystal % 3 * .16) * Math.min(age * 2.4, 1)
      const height = y * (crystal / 3.4 - .91)
      const direction = crystal % 2 ? 1 : -1
      ctx.save()
      ctx.translate(side * (x - 1), height)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(side * reach, direction * reach * .35)
      for (const branch of [.39, .65]) {
        const px = side * reach * branch
        const py = direction * reach * .35 * branch
        ctx.moveTo(px + side * reach * .13, py - reach * .31)
        ctx.lineTo(px, py)
        ctx.lineTo(px + side * reach * .16, py + reach * .28)
      }
      lightStroke(field, 1, power * Math.sin(age * Math.PI) * .9, crystal % 2 ? colors.glint : colors.main)
      ctx.restore()
    }
  }
}

const painters: Record<CardEffect, (field: Field) => void> = {
  water: tide, halo: corona, arc: electricity, prism: refraction, mist: vapor,
  embers: field => driftingLights(field, true), motes: field => driftingLights(field, false), frost: frostBloom,
}

export function CardAtmosphere({ effect, rarity, seed, reduced }: {
  effect: CardEffect; rarity: Rarity; seed: number; reduced: boolean
}) {
  const surface = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = surface.current
    const ctx = canvas?.getContext('2d')
    const card = canvas?.parentElement
    if (!canvas || !ctx || !card) return
    const offset = seed % 120 / 71
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    let frame = 0
    let last = -Infinity

    function draw(at: number) {
      if (!canvas || !ctx || !card) return
      const { clientWidth: width, clientHeight: height } = canvas
      if (!width || !height) return
      const wide = Math.round(width * ratio)
      const high = Math.round(height * ratio)
      if (canvas.width !== wide || canvas.height !== high) {
        canvas.width = wide
        canvas.height = high
      }
      ctx.setTransform(ratio, 0, 0, ratio, width * ratio / 2, height * ratio / 2)
      ctx.clearRect(-width / 2, -height / 2, width, height)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      painters[effect]({ ctx, x: card.clientWidth / 2, y: card.clientHeight / 2,
        margin: (width - card.clientWidth) / 2, time: at + offset, power: intensity[rarity], colors: effectColors[effect] })
    }

    function tick(at: number) {
      if (at - last >= 32) {
        draw(at / 1000)
        last = at
      }
      frame = requestAnimationFrame(tick)
    }
    draw(.8)
    const observer = new ResizeObserver(() => draw(reduced ? .8 : performance.now() / 1000))
    observer.observe(canvas)
    if (!reduced) frame = requestAnimationFrame(tick)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [effect, rarity, seed, reduced])

  return <canvas className="viewer-atmosphere" data-effect={effect} aria-hidden="true" ref={surface}/>
}
