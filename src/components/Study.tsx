import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, AudioLines, Check, ChevronRight, CircleAlert, Eye, Gem, RotateCcw, Sparkles, Volume2 } from 'lucide-react'
import type { Data, Feedback, Mode } from '@/core/schema'
import { wordKey } from '@/core/schema'
import type { Word } from '@/data/books'
import { grades, mistakeSkill, ratingSchedule, recordRating, skillOf } from '@/core/learning'
import { getNote, meaningOf } from '@/data/editorial'
import { exactSpelling, makeChoices } from '@/core/practice'
import { speechFailureText, speechNeedsSetup } from '@/core/speech'
import type { SpeechFailure } from '@/core/speech'
import { pronounce, stopPronunciation } from '@/core/audio'
import { save } from '@/core/vault'
import { WordCard } from './WordCard'
import { Pronounce, WordDetails } from './WordDetails'
import { AICoach } from './AICoach'

export const modeLabels: Record<Mode, string> = {
  pack: '拆包学习', sprint: '六级冲刺', recall: '快速认词', spell: '拼写训练',
  listen: '听音识词', mistakes: '错词专项', review: '到期复习', context: '语境辨义', dictation: '听写',
}
const gradeButtons = [
  { value: 'again', label: '不认识', english: 'Again' },
  { value: 'hard', label: '有点难', english: 'Hard' },
  { value: 'good', label: '认识', english: 'Good' },
  { value: 'easy', label: '很熟悉', english: 'Easy' },
] as const

function interval(due: Date, now: Date) {
  const min = Math.max(1, Math.ceil((due.getTime() - now.getTime()) / 60000))
  if (min < 60) return `${min} 分钟`
  if (min < 1440) return `${Math.ceil(min / 60)} 小时`
  return `${Math.round(min / 1440)} 天`
}

export function Study({ mode, words, pool, data, staticMotion, back, finish, switchRecall }: {
  mode: Mode; words: Word[]; pool: Word[]; data: Data; staticMotion: boolean
  back: () => void; finish: () => void; switchRecall: () => void
}) {
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [unfamiliar, setUnfamiliar] = useState<Word[]>([])
  const [revision, setRevision] = useState(0)
  const [retry, setRetry] = useState<Word[] | null>(null)
  const queue = retry ?? words
  useEffect(() => stopPronunciation, [])
  const word = queue[index]
  if (!word) return <div className="lesson-done panel">
    <div className="completion-gem"><Gem size={35}/></div><h1>{queue.length ? '本组学习完成' : '暂无可练习的词'}</h1>
    <p>{queue.length ? `你完成了 ${queue.length} 张词卡，其中 ${correct} 张回忆成功。` : '可切换词书，或等候词卡到期后再练习。'}</p>
    {unfamiliar.length > 0 && <button className="secondary" onClick={() => {
      setRetry(unfamiliar); setIndex(0); setCorrect(0); setUnfamiliar([]); setRevision(v => v + 1)
    }}><RotateCcw size={17}/>再练 {unfamiliar.length} 张错卡</button>}
    <button className="primary" onClick={finish}>返回首页 <ArrowRight size={17}/></button>
  </div>

  return <div className="study-page">
    <div className="session-top">
      <button className="text-button" onClick={back}><ArrowLeft size={18}/>退出练习</button>
      <span>{mode === 'sprint' && data.settings.exam === 'cet4' ? '四级冲刺' : modeLabels[mode]} · {index + 1} / {queue.length}</span>
    </div>
    <progress className="session-progress" aria-label="本组学习进度" value={index} max={queue.length}/>
    <Question key={`${revision}:${index}`} word={word} mode={mode} pool={pool} data={data}
      staticMotion={staticMotion} switchRecall={switchRecall} onComplete={feedback => {
        stopPronunciation()
        if (feedback === 'again') setUnfamiliar(current => [...current, word])
        else setCorrect(value => value + 1)
        setIndex(value => value + 1)
      }}/>
  </div>
}

function Question({ word, mode, pool, data, staticMotion, onComplete, switchRecall }: {
  word: Word; mode: Mode; pool: Word[]; data: Data; staticMotion: boolean;
  onComplete: (feedback: Feedback) => void; switchRecall: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [input, setInput] = useState('')
  const [chosen, setChosen] = useState('')
  const [result, setResult] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [audioError, setAudioError] = useState<SpeechFailure | null>(null)
  const locked = useRef(false)
  const revealHeading = useRef<HTMLHeadingElement>(null)
  const note = getNote(word.word)
  const skill = mode === 'mistakes' ? mistakeSkill(data, word.word) : skillOf(mode)
  const context = mode === 'context' || mode === 'sprint' && note !== undefined
  const spelling = skill === 'spelling'
  const listening = skill === 'listening' || mode === 'dictation'
  const choices = useMemo(() => makeChoices(word, pool, context), [word, pool, context])
  const selection = !spelling && (listening || mode === 'context') && choices.length > 0
  const activeContext = context && note
  const now = new Date()
  const schedule = revealed ? ratingSchedule(data, word, skill, now) : undefined
  useEffect(() => {
    if (revealed) revealHeading.current?.focus()
  }, [revealed])

  function play() {
    setAudioError(null)
    pronounce(word.word, data.settings, { onError: setAudioError })
  }
  function check() {
    const passes = exactSpelling(input, word.word)
    setResult(passes)
    setRevealed(true)
  }
  async function rate(feedback: Feedback) {
    if (locked.current) return
    locked.current = true
    setSaving(true)
    setError('')
    try {
      await save(current => recordRating(current, word, mode, feedback, new Date(), skill))
      onComplete(feedback)
    } catch {
      setError('保存失败，请重试。')
      locked.current = false
      setSaving(false)
    }
  }

  return <article className="question panel">
    <div className="question-visual"><WordCard word={word} compact concealed={!revealed && (listening || spelling)} staticMotion={staticMotion}/></div>
    <div className="question-main">
      {revealed ? <>
        <h1 ref={revealHeading} tabIndex={-1} className="question-label">
          {result === null ? <><Sparkles size={16}/> 单词详解</> : result ? <><Check size={17}/> 回答正确</> : <><CircleAlert size={16}/> 对照答案</>}
        </h1>
        <WordDetails word={word} settings={data.settings}/>
        <AICoach word={word.word} related={note?.example} mistakes={data.history.filter(e => e.rating === 'again').slice(-10).map(e => e.word)}/>
      </> : <>
        <h1>{listening ? '听一听，回忆这个词' : spelling ? '根据释义拼写' : activeContext ? '根据语境回忆词义' : '回忆这个单词的中文意思'}</h1>
        {listening && <div className="audio-prompt">
          <button onClick={play} className="secondary"><Volume2 size={19}/>播放发音</button>
          {audioError && <p role="status">{speechFailureText[audioError]}
            {speechNeedsSetup(audioError) && ' 在手机「设置 → 文字转语音」里安装英语语音包。'}{' '}
            <button className="text-button" onClick={switchRecall}>切换快速认词 <ChevronRight size={15}/></button></p>}
        </div>}
        {!listening && !spelling && <div className="prompt-word"><b lang="en">{word.word}</b><Pronounce text={word.word} settings={data.settings}/></div>}
        {!listening && spelling && <p className="meaning-prompt">{meaningOf(word) || '本词暂无中文释义，可查看答案。'}</p>}
        {activeContext && <div className="example context-prompt"><span><AudioLines size={16}/> 阅读语境</span><p lang="en">{note.example}</p></div>}
        {spelling && <form className="answer-form" onSubmit={event => { event.preventDefault(); check() }}>
          <label className="visually-hidden" htmlFor="spelling">英文拼写</label>
          <input id="spelling" lang="en" value={input} onChange={event => setInput(event.target.value)} placeholder="输入英文单词" autoCapitalize="none" autoComplete="off" spellCheck={false}/>
          <button className="primary" disabled={!input.trim()}>检查拼写</button>
        </form>}
        {selection && <div className="choice-grid">{choices.map(c =>
          <button className="secondary" key={c.id} onClick={() => {
            setChosen(c.text); setResult(c.id === wordKey(word.word)); setRevealed(true)
          }}>{c.text}</button>)}</div>}
        {!spelling && !selection && <p className="hint">先在心里说出意思，再对照答案。</p>}
        <button className={spelling || selection ? 'text-button' : 'primary'} onClick={() => {
          if (spelling || selection) setResult(false)
          setRevealed(true)
        }}><Eye size={18}/>查看答案</button>
      </>}
      {revealed && <>
        {result === false && (input || chosen) && <p className="feedback-line">你的回答：{input || chosen}</p>}
        <div className="ratings" aria-label="记忆评分">{gradeButtons
          .filter(button => result !== false || button.value === 'again')
          .map(button => <button key={button.value} className={`rating ${button.value}`}
            disabled={saving} onClick={() => void rate(button.value)}>
            <strong>{button.label}</strong><span>{button.english}{schedule ? ` · ${interval(schedule[grades[button.value]].card.due, now)}` : ''}</span>
          </button>)}</div>
      </>}
      {error && <p className="notice error" role="alert">{error}</p>}
    </div>
  </article>
}

