import { useEffect, useId, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { other, related as wordRelations } from '@/data/editorial'
import { save } from '@/core/vault'
import './AICoach.css'

const tasks = {
  explain: '解释词义',
  collocations: '搭配与例句',
  confusion: '易混词辨析',
  exercises: '错词练习',
  context: '阅读语境解释',
}
type Task = keyof typeof tasks
type Availability = 'checking' | 'available' | 'unavailable'
type CoachResponse = { available?: boolean; answer?: string; error?: string }

function endpoint() {
  return new URL('api/ai', new URL(import.meta.env.BASE_URL, document.baseURI))
}

export function AICoach({ word, related, mistakes }: { word: string; related?: string; mistakes: string[] }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [availability, setAvailability] = useState<Availability>('checking')
  const [purpose, setPurpose] = useState<Task>('explain')
  const [comparison, setComparison] = useState(() => {
    const relation = wordRelations(word).find(item => item.kind === '易混' || item.kind === '近义')
    return relation ? other(relation, word) : ''
  })
  const [context, setContext] = useState(related ?? '')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [note, setNote] = useState('')
  const [reportStatus, setReportStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const request = useRef<AbortController | undefined>(undefined)
  const selectedMistakes = [...new Set(mistakes)].slice(-6)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const verify = () => {
      setAvailability('checking')
      void fetch(endpoint(), { cache: 'no-store', signal: controller.signal })
        .then(async response => response.ok && (await response.json() as CoachResponse).available === true)
        .then(available => {
          if (!controller.signal.aborted) setAvailability(available ? 'available' : 'unavailable')
        })
        .catch(() => {
          if (!controller.signal.aborted) setAvailability('unavailable')
        })
    }
    verify()
    window.addEventListener('online', verify)
    window.addEventListener('offline', verify)
    return () => {
      controller.abort()
      window.removeEventListener('online', verify)
      window.removeEventListener('offline', verify)
    }
  }, [open])

  useEffect(() => () => request.current?.abort(), [])

  async function ask() {
    if (busy || availability !== 'available') return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setAnswer('')
    setError('')
    setNote('')
    setReporting(false)
    setReportStatus('')
    try {
      const response = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          purpose, word,
          ...(purpose === 'confusion' ? { comparison: comparison.trim() } : {}),
          ...(purpose === 'context' ? { context: context.trim() } : {}),
          ...(purpose === 'exercises' ? { mistakes: selectedMistakes } : {}),
        }),
        cache: 'no-store',
        signal: controller.signal,
      })
      const result = await response.json() as CoachResponse
      if (!response.ok || typeof result.answer !== 'string') {
        setError(result.error || 'AI 辅导暂不可用。')
        return
      }
      setAnswer(result.answer)
    } catch {
      if (!controller.signal.aborted) setError('AI 辅导当前无法连接，请稍后重试。')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  async function report() {
    const message = note.trim()
    if (!message || submitting) return
    setSubmitting(true)
    try {
      await save(current => ({ ...current, aiFeedback: [...current.aiFeedback, { word, at: Date.now(), note: message }] }))
      setReporting(false)
      setNote('')
      setReportStatus('问题已保存到本机。')
    } catch {
      setReportStatus('保存失败，请重试。')
    } finally {
      setSubmitting(false)
    }
  }

  const incomplete = (purpose === 'confusion' && !comparison.trim())
    || (purpose === 'context' && !context.trim())
    || (purpose === 'exercises' && !selectedMistakes.length)

  return <details className="ai-coach" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><Sparkles size={16} aria-hidden="true"/> AI 辅导</summary>
    {open && <div className="ai-content">
      {availability === 'unavailable' && <p>需要联网并在本地服务中配置 AI 接口。词汇学习可照常使用。</p>}
      {availability === 'checking' && <p role="status">检查 AI 服务中…</p>}
      {availability === 'available' && <>
        <div className="ai-controls">
          <label htmlFor={`${id}-purpose`}>选择辅导内容</label>
          <select id={`${id}-purpose`} value={purpose} aria-label="AI 辅导类型" disabled={busy}
            onChange={event => setPurpose(event.currentTarget.value as Task)}>
            {Object.entries(tasks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {purpose === 'confusion' && <label className="ai-input">
          待比较的单词<input value={comparison} maxLength={160} disabled={busy} placeholder="例如 adopt"
            onChange={event => setComparison(event.currentTarget.value)}/>
        </label>}
        {purpose === 'context' && <label className="ai-input">
          英文阅读片段<textarea rows={3} value={context} maxLength={1200} disabled={busy}
            onChange={event => setContext(event.currentTarget.value)}/>
        </label>}
        {purpose === 'exercises' && <p>{selectedMistakes.length
          ? `将提交这些错词进行练习生成：${selectedMistakes.join('、')}` : '学习中标记错词后，即可生成专项练习。'}</p>}
        <p>点击生成后，本题所需文字会发送到已配置的 AI 服务。</p>
        <button type="button" className="secondary" onClick={() => void ask()} disabled={busy || incomplete}>
          {busy ? '正在生成…' : '生成辅导'}
        </button>
      </>}
      {error && <p className="ai-error" role="alert">{error}</p>}
      {answer && <div className="ai-result">
        <strong>AI 生成 · 请核对词义与例句</strong>
        <div className="ai-answer" aria-live="polite">{answer}</div>
        {!reporting && !reportStatus && <button className="text-button" type="button"
          onClick={() => setReporting(true)}>反馈内容问题</button>}
        {reporting && <div className="ai-feedback">
          <label className="ai-input">
            问题说明<textarea rows={2} value={note} maxLength={500} placeholder="写下需要核对的内容"
              onChange={event => setNote(event.currentTarget.value)}/>
          </label>
          <button type="button" className="secondary" disabled={!note.trim() || submitting}
            onClick={() => void report()}>在本机记录</button>
        </div>}
        {reportStatus && <p role="status">{reportStatus}</p>}
      </div>}
    </div>}
  </details>
}
