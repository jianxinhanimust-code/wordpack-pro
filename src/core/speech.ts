/**
 * 发音（Web Speech API）
 * 听写模式依赖浏览器/系统 TTS，不依赖网络词典 API。
 */

/** 列出可用的英语语音 */
export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return []
  return speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang))
}

/** 等待语音列表加载完成（部分浏览器是异步的） */
export function waitVoices(timeout = 2000): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') return resolve([])
    const existing = listVoices()
    if (existing.length > 0) return resolve(existing)

    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve(listVoices())
    }
    speechSynthesis.addEventListener('voiceschanged', finish, { once: true })
    setTimeout(finish, timeout)
  })
}

/** 朗读一个单词或句子 */
export function speak(
  text: string,
  opts: { voice?: string; rate?: number; lang?: string; onEnd?: () => void; onError?: () => void } = {},
): void {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    opts.onError?.()
    opts.onEnd?.()
    return
  }
  // 打断上一次朗读，避免堆积
  speechSynthesis.cancel()

  const u = new SpeechSynthesisUtterance(text)
  u.lang = opts.lang ?? 'en-US'
  u.rate = opts.rate ?? 0.9
  const voices = listVoices()
  const matching = voices.filter(v => v.lang.toLowerCase().replace('_', '-') === u.lang.toLowerCase())
  const picked = voices.find(v => v.name === opts.voice)
    ?? matching.find(v => v.localService) ?? matching[0] ?? voices.find(v => v.localService) ?? voices[0]
  if (picked) u.voice = picked
  u.onend = () => opts.onEnd?.()
  u.onerror = event => {
    if (event.error !== 'canceled' && event.error !== 'interrupted') opts.onError?.()
    opts.onEnd?.()
  }
  try { speechSynthesis.speak(u) }
  catch { opts.onError?.(); opts.onEnd?.() }
}

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}