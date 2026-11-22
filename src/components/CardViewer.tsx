import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, X } from 'lucide-react'
import type { Word } from '@/data/books'
import { getNote } from '@/data/editorial'
import { cardDesign } from '@/core/cardArt'
import { WordCard } from './WordCard'
import './CardViewer.css'

export function CardViewer({ cards, initial, reduced, onClose }: {
  cards: Word[]; initial: number; reduced: boolean; onClose: () => void
}) {
  const [index, setIndex] = useState(initial)
  const [reversed, setReversed] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const card = useRef<HTMLButtonElement>(null)
  const label = useId()
  const help = useId()
  const word = cards[index]
  const note = getNote(word.word)
  const senses = word.definitions.slice(0, 3)
  const palette = cardDesign(word.word).palette
  const finish = {
    '--viewer-ink': palette.ink, '--viewer-glow': palette.metal,
    '--viewer-light': palette.light,
  } as CSSProperties

  useEffect(() => {
    const modal = dialog.current
    if (!modal) return
    const trigger = document.activeElement
    modal.showModal()
    card.current?.focus()
    return () => {
      modal.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  function select(next: number) {
    if (next < 0 || next >= cards.length) return
    setIndex(next)
    setReversed(false)
  }

  function handleKeys(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      select(index + (event.key === 'ArrowLeft' ? -1 : 1))
    }
  }

  return <dialog ref={dialog} className="card-viewer" aria-labelledby={label} data-reduced={reduced || undefined}
    onKeyDown={handleKeys} onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="viewer-content" style={finish}>
      <header className="viewer-header">
        <h2 id={label}>词卡预览</h2>
        <button type="button" className="icon-button" aria-label="关闭词卡预览" onClick={onClose}><X size={18}/></button>
      </header>
      <div className="viewer-display">
        <button type="button" className="viewer-card" ref={card}
          aria-label={reversed ? '显示单词正面' : '翻看中文释义'} aria-describedby={help}
          onClick={() => setReversed(value => !value)}>
          <span key={word.id} className="viewer-flip" data-reversed={reversed}>
            <span className="viewer-side viewer-front" aria-hidden={reversed}>
              <WordCard word={word} staticMotion={reduced}/>
            </span>
            <span className="viewer-side viewer-back" aria-hidden={!reversed}>
              <span className="viewer-word" lang="en">{word.word}</span>
              {word.phonetic && <span className="viewer-phonetic">{word.phonetic}</span>}
              <span className="viewer-definitions">
                {note ? <span className="viewer-gloss">{note.meaning}</span> : senses.length ? senses.map(([part, meaning], ordinal) =>
                  <span className="viewer-definition" key={ordinal}>
                    {part && <span className="viewer-part">{part}</span>}
                    <span>{meaning}</span>
                  </span>) : <span>这个词暂时没有中文释义。</span>}
              </span>
              {note?.collocations[0] && <span className="viewer-collocation">
                <span>常用搭配</span><span lang="en">{note.collocations[0]}</span>
              </span>}
            </span>
          </span>
        </button>
      </div>
      <div className="viewer-controls">
        <button type="button" className="icon-button" aria-label="上一张词卡" disabled={index === 0} onClick={() => select(index - 1)}><ArrowLeft size={18}/></button>
        <div className="viewer-guide">
          <span aria-live="polite">{index + 1} / {cards.length}</span>
          <span id={help}><RotateCw size={13}/> {reversed ? '点卡片看正面' : '点卡片看释义'}</span>
        </div>
        <button type="button" className="icon-button" aria-label="下一张词卡" disabled={index === cards.length - 1} onClick={() => select(index + 1)}><ArrowRight size={18}/></button>
      </div>
      <p className="visually-hidden" aria-live="polite">{reversed
        ? note?.meaning ?? senses.map(([part, meaning]) => [part, meaning].filter(Boolean).join(' ')).join('。')
        : ''}</p>
    </div>
  </dialog>
}

