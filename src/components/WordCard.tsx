import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { Word } from '@/data/books'
import { artHeight, artWidth, cardDesign, paintCard } from '@/core/cardArt'

const lightProperties = ['--px', '--py', '--rx', '--ry', '--foil-strength', '--foil-angle']

export function WordCard({ word, compact = false, staticMotion = false, concealed = false }: {
  word: Word; compact?: boolean; staticMotion?: boolean; concealed?: boolean
}) {
  const element = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const queued = useRef(0)
  const design = useMemo(() => cardDesign(word.word, concealed), [word.word, concealed])
  const title = concealed ? 'WordPack' : word.word
  const density = compact ? 1.4 : 2
  const variables = {
    '--card-ink': design.palette.ink, '--card-field': design.palette.field,
    '--card-accent': design.palette.light, '--card-metal': design.palette.metal,
  } as CSSProperties

  useEffect(() => {
    if (canvas.current) paintCard(canvas.current, design)
  }, [design, density])
  useEffect(() => () => cancelAnimationFrame(queued.current), [])

  function follow(event: PointerEvent<HTMLSpanElement>) {
    if (staticMotion) return
    const x = event.clientX
    const y = event.clientY
    cancelAnimationFrame(queued.current)
    queued.current = requestAnimationFrame(() => {
      const target = element.current
      if (!target) return
      const box = target.getBoundingClientRect()
      const pointX = Math.max(0, Math.min(1, (x - box.left) / box.width))
      const pointY = Math.max(0, Math.min(1, (y - box.top) / box.height))
      target.style.setProperty('--px', `${pointX * 100}%`)
      target.style.setProperty('--py', `${pointY * 100}%`)
      target.style.setProperty('--rx', `${(0.5 - pointY) * 11}deg`)
      target.style.setProperty('--ry', `${(pointX - 0.5) * 11}deg`)
      target.style.setProperty('--foil-strength', '.72')
      target.style.setProperty('--foil-angle', `${124 + pointX * 48 - pointY * 26}deg`)
    })
  }
  function reset() {
    cancelAnimationFrame(queued.current)
    for (const name of lightProperties) element.current?.style.removeProperty(name)
  }
  return <span className={`word-card ${compact ? 'compact-card' : ''}`}
      data-pattern={design.fingerprint} data-motif={design.motif} style={variables}
      ref={element} onPointerMove={follow} onPointerLeave={reset} onPointerCancel={reset}>
    <canvas className="card-art" ref={canvas} width={artWidth * density} height={artHeight * density} aria-hidden="true"/>
    <span className="card-foil" aria-hidden="true"/>
    <span className="card-name">
      <span className={`card-title ${title.length > 12 ? 'long-title' : ''}`} lang="en">{title}</span>
      {!concealed && word.phonetic && <span className="card-caption">{word.phonetic}</span>}
    </span>
  </span>
}

