import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { Word } from '@/data/books'
import { artHeight, artWidth, cardDesign, illustrationUrl, paintCard, rarities } from '@/core/cardArt'

const lightProperties = [
  '--px', '--py', '--rx', '--ry', '--foil-strength', '--foil-angle',
  '--background-x', '--background-y', '--subject-x', '--subject-y', '--stars-x', '--stars-y',
]

export function WordCard({ word, compact = false, staticMotion = false, concealed = false, eagerArt = false }: {
  word: Word; compact?: boolean; staticMotion?: boolean; concealed?: boolean; eagerArt?: boolean
}) {
  const element = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const queued = useRef(0)
  const [painted, setPainted] = useState('')
  const [subjectReady, setSubjectReady] = useState(false)
  const design = useMemo(() => cardDesign(word.word, concealed), [word.word, concealed])
  const { identity } = design
  const image = illustrationUrl(concealed ? 'card-back' : design.motif)
  const relief = !concealed && design.motif === 'wing' && subjectReady
  const illustrated = painted === image || relief
  const title = concealed ? 'WordPack' : word.word
  const loading = compact && !eagerArt ? 'lazy' : 'eager'
  const density = compact ? 1.4 : 2
  const variables = {
    '--card-ink': design.palette.ink, '--card-field': design.palette.field,
    '--card-accent': design.palette.light, '--card-metal': design.palette.metal,
  } as CSSProperties

  useEffect(() => {
    if (canvas.current) paintCard(canvas.current, design, illustrated)
  }, [design, density, illustrated])
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
      const offsetX = (pointX - .5) * 2
      const offsetY = (pointY - .5) * 2
      target.style.setProperty('--background-x', `${offsetX * -4}%`)
      target.style.setProperty('--background-y', `${offsetY * -3}%`)
      target.style.setProperty('--subject-x', `${offsetX * 5.5}%`)
      target.style.setProperty('--subject-y', `${offsetY * 4.5}%`)
      target.style.setProperty('--stars-x', `${offsetX * 8}%`)
      target.style.setProperty('--stars-y', `${offsetY * 7}%`)
    })
  }
  function reset() {
    cancelAnimationFrame(queued.current)
    for (const name of lightProperties) element.current?.style.removeProperty(name)
  }
  return <span className={`word-card ${compact ? 'compact-card' : ''}`}
      data-pattern={design.fingerprint} data-motif={design.motif} data-artwork={illustrated || undefined}
      data-series={design.series}
      data-relief={relief || undefined} data-rarity={identity?.rarity} data-variant={!!identity?.variant || undefined} style={variables}
      ref={element} onPointerMove={follow} onPointerLeave={reset} onPointerCancel={reset}>
    <span className="card-illustration" aria-hidden="true">
      <img src={image} alt="" loading={loading} decoding="async" draggable={false}
        onLoad={() => setPainted(image)}/>
    </span>
    {!concealed && design.motif === 'wing' && <img className="card-subject" src={illustrationUrl('wing-subject')}
      alt="" aria-hidden="true" loading={loading} decoding="async" draggable={false}
      onLoad={() => setSubjectReady(true)}/>}
    <canvas className="card-art" ref={canvas} width={artWidth * density} height={artHeight * density} aria-hidden="true"/>
    <span className="card-foil" aria-hidden="true"/>
    <span className="card-starlight" aria-hidden="true"/>
    {identity && <span className="card-rim" aria-hidden="true"/>}
    {identity && <span className="card-identity">
      <span className="card-rarity"><strong>{identity.rarity}</strong> <span>{rarities[identity.rarity]}</span></span>
      <span className="card-kind">{identity.variant ? <><span>{identity.kind} · </span>{identity.variant}</> : identity.kind}</span>
    </span>}
    <span className="card-name">
      <span className={`card-title ${title.length > 12 ? 'long-title' : ''}`} lang="en">{title}</span>
      {!concealed && word.phonetic && <span className="card-caption">{word.phonetic}</span>}
    </span>
  </span>
}

