import { useState } from 'react'
import { BookText, ExternalLink, Link2, Volume2 } from 'lucide-react'
import { getNote, other, related } from '@/data/editorial'
import type { Word } from '@/data/books'
import type { Preferences } from '@/core/schema'
import { speechFailureText, speechNeedsSetup } from '@/core/speech'
import { pronounce } from '@/core/audio'
import type { SpeechFailure } from '@/core/speech'

export function Pronounce({ text, settings, label = '播放发音' }: { text: string; settings: Preferences; label?: string }) {
  const [failure, setFailure] = useState<SpeechFailure | null>(null)
  return <span className="pronounce">
    <button className="icon-button" aria-label={label} title={label} onClick={() => {
      setFailure(null)
      pronounce(text, settings, { onError: setFailure })
    }}><Volume2 size={18}/></button>
    {failure && <small role="status">{speechFailureText[failure]}
      {speechNeedsSetup(failure) && ' 在手机「设置 → 文字转语音」里安装英语语音包。'}</small>}
  </span>
}

export function WordDetails({ word, settings }: { word: Word; settings: Preferences }) {
  const note = getNote(word.word)
  const links = related(word.word)
  return <div className="word-details">
    <div className="definition-head"><div>
      <h2 lang="en">{word.word}</h2>
      <div className="phonetics">{note?.uk && note.us
        ? <><span>英 /{note.uk}/</span><span>美 /{note.us}/</span></>
        : <span>{word.phonetic || '暂无音标'}</span>}</div>
    </div><Pronounce key={word.id} text={word.word} settings={settings}/></div>
    <ul className="senses">{word.definitions.length
      ? word.definitions.map(([pos, value], i) => <li key={i}>{pos && <small>{pos}</small>}{value}</li>)
      : <li>{note?.meaning ?? '词本中暂无释义'}</li>}</ul>
    {note && <>
      <div className="collocations">{note.collocations.map(phrase => <span key={phrase} lang="en">{phrase}</span>)}</div>
      <div className="example"><span><BookText size={15}/> 用法例句</span><p lang="en">{note.example}</p><small>{note.translation}</small></div>
      {note.root && <p className="word-root">{note.root}</p>}
    </>}
    {links.length > 0 && <div className="small-relations">{links.map(link =>
      <span key={link.b + link.a} title={link.label}><Link2 size={14}/>{link.kind} · {other(link, word.word)} <a href={link.source} target="_blank" rel="noreferrer" aria-label="词汇关系资料"><ExternalLink size={12}/></a></span>)}</div>}
  </div>
}

