import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { ArrowLeft, ArrowRight, ChevronsRight, FastForward, Gem, PackageOpen, Sparkles } from 'lucide-react'
import type { BookMeta, Word } from '@/data/books'
import type { Preferences } from '@/core/schema'
import { wordKey } from '@/core/schema'
import { relations } from '@/data/editorial'
import { collect } from '@/core/vault'
import { foilSound } from '@/core/foilAudio'
import { WordCard } from './WordCard'
import { CardViewer } from './CardViewer'

type Phase = 'sealed' | 'opening' | 'revealed'
type Edge = { id: string; from: number; to?: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function FoilDecor({ edition }: { edition: string }) {
  return <>
    <span className="foil-body" aria-hidden="true">
      <i className="foil-border"/><i className="foil-orbit orbit-a"/><i className="foil-orbit orbit-b"/><i className="foil-orbit orbit-c"/>
      <i className="foil-crystal"><Gem size={68} strokeWidth={0.8}/></i>
      <span className="foil-wordmark">WORDPACK<strong>{edition}</strong></span>
      <span className="foil-edition">VOCABULARY CARDS</span>
      <i className="foil-crimp bottom"/>
    </span>
    <span className="foil-tab" aria-hidden="true"><i className="foil-crimp"/><i className="tab-grip"><ChevronsRight size={22}/></i></span>
    <span className="foil-cut" aria-hidden="true"/><span className="foil-fresh" aria-hidden="true"/>
  </>
}

export function Pack({ words, active, settings, collected, reduced, disabledMotion, back, learn, choose }: {
  words: Word[]; active: BookMeta; settings: Preferences; reduced: boolean; disabledMotion: boolean;
  collected: Record<string, number>;
  back: () => void; learn: (words: Word[]) => void; choose: () => void
}) {
  const [phase, setPhase] = useState<Phase>('sealed')
  const [cards, setCards] = useState<Word[]>([])
  const [skip, setSkip] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const start = useRef<{ id: number; x: number; y: number; travel: number } | null>(null)
  /** 词卡预览的触摸起点。只用来过滤滑动；打开动作统一交给 click。 */
  const previewTouch = useRef<{ id: number; index: number; x: number; y: number } | null>(null)
  const hold = useRef(false)
  const skipRequested = useRef(false)
  const mounted = useRef(false)
  const raf = useRef(0)
  const transition = useRef<number | undefined>(undefined)
  const matches = useMemo(() => relations.flatMap(relation => {
    const a = cards.findIndex(w => wordKey(w.word) === relation.a)
    const b = cards.findIndex(w => wordKey(w.word) === relation.b)
    const id = relation.a + ':' + relation.b
    if (a >= 0 && b >= 0) return [{ relation, edge: { id, from: Math.min(a, b), to: Math.max(a, b) } as Edge }]
    const index = a >= 0 ? a : b
    if (index < 0 || !Object.hasOwn(collected, a >= 0 ? relation.b : relation.a)) return []
    return [{ relation, edge: { id, from: index } as Edge }]
  }), [cards, collected])
  const edges = useMemo(() => matches.map(match => match.edge), [matches])
  const linked = new Set(edges.flatMap(edge => [edge.from, edge.to]))
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(transition.current)
      cancelAnimationFrame(raf.current)
    }
  }, [])
  useEffect(() => {
    if (phase === 'revealed' && matches.length && settings.sound && !skip) foilSound('resonate')
  }, [phase, matches.length, settings.sound, skip])

  function paint(progress: number, pull: number, y: number) {
    const element = stage.current
    if (!element) return
    element.style.setProperty('--tear', String(progress))
    element.style.setProperty('--pull', `${pull}px`)
    element.style.setProperty('--lift', `${y}px`)
    element.style.setProperty('--lean', `${progress * -9}deg`)
    element.style.setProperty('--glint', `${22 + progress * 77}%`)
  }
  function reset() {
    if (hold.current) return
    start.current = null
    cancelAnimationFrame(raf.current)
    setDragging(false)
    paint(0, 0, 0)
  }
  async function open() {
    if (hold.current || !words.length) return
    hold.current = true
    const drag = start.current
    start.current = null
    cancelAnimationFrame(raf.current)
    if (drag) paint(1, drag.travel, 0)
    setDragging(false)
    setError('')
    setPhase('opening')
    if (settings.sound) foilSound('open')
    const selected = words.slice(0, 5)
    try {
      await collect(selected)
      if (!mounted.current) return
      setCards(selected)
      if (disabledMotion) { learn(selected); return }
      if (skipRequested.current) setPhase('revealed')
      else transition.current = window.setTimeout(() => setPhase('revealed'), reduced ? 40 : 580)
    } catch {
      if (!mounted.current) return
      hold.current = false
      skipRequested.current = false
      setSkip(false)
      reset()
      setPhase('sealed')
      setError('本次拆包未能保存，请重试。')
    }
  }

  function skipAnimation() {
    skipRequested.current = true
    setSkip(true)
    if (transition.current !== undefined) {
      window.clearTimeout(transition.current)
      setPhase('revealed')
    }
  }

  function inspect(button: HTMLButtonElement, index: number) {
    if (selectedCard !== null) return
    button.focus({ preventScroll: true })
    setSelectedCard(index)
  }

  function down(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || phase !== 'sealed' || !words.length) return
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    start.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
      travel: clamp(event.currentTarget.offsetWidth * 0.61, 88, 154) }
    setDragging(true)
    if (settings.sound) foilSound('touch')
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const drag = start.current
    if (!drag || drag.id !== event.pointerId) return
    const pull = clamp(event.clientX - drag.x, 0, drag.travel)
    const lift = clamp((event.clientY - drag.y) * 0.35, -23, 23)
    const progress = pull / drag.travel
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => paint(progress, pull, lift))
    if (settings.sound && progress > 0.05) foilSound('scrape', progress)
    if (progress >= 1) void open()
  }

  return <div className="pack-page">
    <div className="session-top"><button className="text-button" onClick={back}><ArrowLeft size={17}/>返回首页</button>
      <span>{active.name}</span></div>
    <section className={`pack-stage ${reduced ? 'pack-static' : ''} ${dragging ? 'dragging' : ''}`} ref={stage} data-phase={phase} data-exam={settings.exam}>
      <div className="stage-studio" aria-hidden="true"/>
      <div className="stage-light" aria-hidden="true"/>
      <div className="stage-title">
        <h1>{phase === 'revealed' ? '你的新词卡' : '拆开这一包'}</h1>
        <p>{phase === 'revealed' ? `${cards.length} 张词卡已收入图鉴 · 点选词卡预览`
          : words.length ? '按住封口，向右撕开词包' : '当前没有可拆的词卡。'}</p>
      </div>
      {phase !== 'revealed' && <div className="pack-dais">
        <button type="button" aria-label="拖动封口，或按回车打开卡包" className="foil-pack" disabled={!words.length}
          onPointerDown={down} onPointerMove={move} onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}
          onKeyDown={event => { if (event.key === 'Escape') reset() }}
          onClick={event => { if (event.detail === 0) void open() }}>
          <FoilDecor edition={active.id === 'cet6' ? 'CET–6' : active.id === 'cet4' ? 'CET–4' : 'PRO'}/>
        </button>
      </div>}
      {phase === 'revealed' && <div className={`reveal-area ${skip ? 'skip' : ''}`}>
        <div className="reveal-deck">
          {cards.map((word, i) => <button type="button" className={`reveal-slot ${linked.has(i) ? 'linked-card' : ''}`}
            key={word.id} style={{ '--index': i } as CSSProperties}
            aria-label={`预览词卡 ${word.word}`}
            onPointerDown={event => {
              if (event.pointerType === 'touch' && event.isPrimary) {
                previewTouch.current = { id: event.pointerId, index: i, x: event.clientX, y: event.clientY }
              }
            }}
            onPointerCancel={() => { previewTouch.current = null }}
            onClick={event => {
              // 只在 click 上打开预览。若在 pointerup 里打开，浏览器随后补发的 click 会落在
              // 刚弹出的卡片上，导致预览一打开就翻到背面。滑动超过 10px 视为滚动，不打开。
              const touch = previewTouch.current
              previewTouch.current = null
              if (touch && touch.index === i
                && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) >= 10) return
              inspect(event.currentTarget, i)
            }}>
            <span className="reveal-flip"><span className="reveal-back" aria-hidden="true"><Gem size={34}/></span>
              <span className="reveal-front"><WordCard word={word} compact staticMotion={reduced}/></span></span>
          </button>)}
          {edges.length > 0 && <ResonanceBeams edges={edges}/>}
        </div>
        {matches.length > 0 && <div className="resonance-note"><Sparkles size={16}/>
          词汇共鸣 · {matches.map(({ relation, edge }) => `${relation.a} × ${relation.b}（${relation.kind}${edge.to === undefined ? ' · 已收藏' : ''}）`).join('、')}</div>}
      </div>}
      <div className="pack-actions">
        {phase === 'sealed' && (words.length
          ? <><div className="tear-meter" aria-hidden="true"><i/><ChevronsRight size={16}/></div>
            <button className="primary" onClick={() => void open()}><PackageOpen size={18}/>直接打开</button></>
          : <button className="secondary" onClick={choose}>选择词书<ArrowRight size={16}/></button>)}
        {phase === 'opening' && <><span role="status">正在揭晓…</span>{!disabledMotion && !reduced &&
          <button className="text-button" onClick={skipAnimation} disabled={skip}><FastForward size={18}/>跳过动画</button>}</>}
        {phase === 'revealed' && <><button className="text-button" onClick={skipAnimation} disabled={skip || reduced}><FastForward size={18}/>跳过动画</button>
          <button className="primary" onClick={() => learn(cards)}>开始学习 <ArrowRight size={18}/></button></>}
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
    </section>
    {selectedCard !== null && <CardViewer cards={cards} initial={selectedCard} reduced={reduced}
      onClose={() => setSelectedCard(null)}/>}
  </div>
}

function ResonanceBeams({ edges }: { edges: Edge[] }) {
  const layer = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<{ id: string; style: CSSProperties }[]>([])
  useLayoutEffect(() => {
    const container = layer.current?.parentElement
    if (!container) return
    function place() {
      if (!container) return
      const cards = Array.from(container.querySelectorAll<HTMLElement>('.reveal-slot'))
      const box = (element: HTMLElement) => ({
        x: element.offsetLeft + element.offsetWidth / 2,
        y: element.offsetTop + element.offsetHeight / 2,
        w: element.offsetWidth,
        h: element.offsetHeight,
      })
      setLines(edges.flatMap(edge => {
        const left = cards[edge.from]
        if (!left) return []
        const start = box(left)
        const right = edge.to === undefined ? undefined : cards[edge.to]
        const end = right ? box(right) : { x: start.x < container.clientWidth / 2 ? 7 : container.clientWidth - 7, y: start.y, w: 0, h: 0 }
        const dx = end.x - start.x
        const dy = end.y - start.y
        const border = (point: typeof start) => Math.min(dx ? point.w / (2 * Math.abs(dx)) : Infinity, dy ? point.h / (2 * Math.abs(dy)) : Infinity)
        const a = border(start)
        const b = border(end)
        return [{ id: edge.id, style: {
          '--beam-x': `${start.x + dx * a}px`, '--beam-y': `${start.y + dy * a}px`,
          '--beam-length': `${Math.max(0, Math.hypot(dx, dy) * (1 - a - b))}px`,
          '--beam-angle': `${Math.atan2(dy, dx)}rad`,
        } as CSSProperties }]
      }))
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(container)
    return () => observer.disconnect()
  }, [edges])
  return <div className="resonance-layer" ref={layer} aria-hidden="true">
    {lines.map(({ id, style }) => <div className="resonance-beam" key={id} style={style}><i/><i/><i/></div>)}
  </div>
}

