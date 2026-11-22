/**
 * 发音（Web Speech API）
 * 听写模式依赖浏览器/系统 TTS，不依赖网络词典 API。
 *
 * 失败原因必须分开报：设备没有英语语音包、首点语音列表还没加载、浏览器拦了非手势调用，
 * 这三者的处理方式完全不同，不能都显示「设备语音不可用」。
 */

/** 语音失败的分类，用来给用户不同的提示 */
export type SpeechFailure =
  | 'unsupported' | 'no-voice' | 'language-unavailable' | 'not-allowed'
  | 'synthesis-failed' | 'audio-busy' | 'network' | 'canceled' | 'interrupted' | 'unknown'

export const speechFailureText: Record<SpeechFailure, string> = {
  unsupported: '这个浏览器不支持语音合成。',
  'no-voice': '设备里没有英语语音包。',
  'language-unavailable': '缺少英语语音，需在系统「文字转语音」里下载。',
  'not-allowed': '浏览器拦截了语音播放，请再点一次。',
  'synthesis-failed': '语音引擎播放失败，可在系统「文字转语音」里更换引擎。',
  'audio-busy': '音频通道被其他应用占用，稍后再试。',
  network: '在线语音需要网络，当前连接失败。',
  canceled: '播放被打断。',
  interrupted: '播放被打断。',
  unknown: '设备语音不可用。',
}

/**
 * 需要用户去系统里「安装英语语音包」的原因。
 * 其他失败（引擎报错、浏览器拦截）各自的消息里已经带了对应建议，不再重复追加。
 */
export const speechNeedsSetup = (failure: SpeechFailure) =>
  failure === 'no-voice' || failure === 'language-unavailable'

const isEnglish = (voice: SpeechSynthesisVoice) => /^en(-|_|$)/i.test(voice.lang)

/** 列出可用的英语语音 */
export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return []
  return speechSynthesis.getVoices().filter(isEnglish)
}

/** 设备上的语音概况，用于设置页自检 */
export function voiceReport() {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    return { supported: false, total: 0, english: 0, local: 0 }
  }
  const all = speechSynthesis.getVoices()
  return {
    supported: true,
    total: all.length,
    english: all.filter(isEnglish).length,
    local: all.filter(voice => voice.localService).length,
  }
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

/**
 * 把浏览器的 SpeechSynthesisErrorEvent.error 翻译成可操作的原因。
 * voicesAtCall 决定 synthesis-failed 到底是「设备没有英语语音」还是「引擎自己失败」。
 */
export function classifySpeechError(error: string, voicesAtCall: number): SpeechFailure {
  switch (error) {
    case 'not-allowed': return 'not-allowed'
    case 'canceled': return 'canceled'
    case 'interrupted': return 'interrupted'
    case 'audio-busy': return 'audio-busy'
    case 'network': return 'network'
    case 'language-unavailable': return 'language-unavailable'
    case 'voice-unavailable': return 'language-unavailable'
    case 'synthesis-unavailable': return 'synthesis-failed'
    case 'synthesis-failed': return voicesAtCall === 0 ? 'no-voice' : 'synthesis-failed'
    default: return 'unknown'
  }
}

/**
 * 朗读一个单词或句子。
 * onError 会带上分类原因；canceled / interrupted 是正常打断，调用方一般忽略。
 */
export function speak(
  text: string,
  opts: { voice?: string; rate?: number; lang?: string; onEnd?: () => void; onError?: (failure: SpeechFailure) => void } = {},
): void {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    opts.onError?.('unsupported')
    opts.onEnd?.()
    return
  }
  // 只打断正在播放的那句。Android Chrome 上无条件 cancel 会把紧接着提交的朗读一起打掉，
  // 表现就是「点了没声 + 报错」。
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel()

  const voices = listVoices()
  if (speechSynthesis.getVoices().length === 0) {
    // 语音列表是异步填充的：这次可能失败，先把列表预热，下一次点击就能选中正确的语音
    void waitVoices(1500)
  }

  const u = new SpeechSynthesisUtterance(text)
  // 设备没有英语语音时不要把 lang 钉在 en-US：钉死会让引擎直接报 language-unavailable，
  // 交给系统默认引擎（中文语音读英文单词）反而能出声。
  u.lang = voices.length > 0 ? (opts.lang ?? 'en-US') : (document?.documentElement.lang || 'en-US')
  u.rate = opts.rate ?? 0.9
  const matching = voices.filter(voice => voice.lang.toLowerCase().replace('_', '-') === u.lang.toLowerCase())
  const picked = voices.find(voice => voice.name === opts.voice)
    ?? matching.find(voice => voice.localService) ?? matching[0]
    ?? voices.find(voice => voice.localService) ?? voices[0]
  // 语音对象可能已经失效（voiceschanged 之后旧对象会抛 TypeError）。
  // 赋值失败就退回引擎默认语音，不能让整段朗读因此中断。
  if (picked) {
    try { u.voice = picked } catch { /* 用默认语音 */ }
  }

  let settled = false
  u.onstart = () => { settled = true }
  u.onend = () => { settled = true; opts.onEnd?.() }
  u.onerror = event => {
    settled = true
    const failure = classifySpeechError(event.error ?? '', voices.length)
    if (failure !== 'canceled' && failure !== 'interrupted') opts.onError?.(failure)
    opts.onEnd?.()
  }
  try {
    speechSynthesis.speak(u)
    // 兜底：少数实现既不触发 start 也不触发 error。只在「设备确实没有英语语音」时判定，
    // 有语音却不响的交回 onerror，避免把慢引擎误报成不可用。
    setTimeout(() => {
      if (settled || voices.length > 0) return
      if (speechSynthesis.speaking || speechSynthesis.pending) return
      settled = true
      opts.onError?.('no-voice')
    }, 2000)
  } catch {
    settled = true
    opts.onError?.(voices.length === 0 ? 'no-voice' : 'synthesis-failed')
    opts.onEnd?.()
  }
}

export function stopSpeaking(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}
