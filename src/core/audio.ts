/**
 * 发音：优先播放站点自带的音频，其次系统 TTS，最后在线发音。
 *
 * 站点自带的音频（public/audio）由 scripts/build_audio.py 生成，手机不需要安装
 * 任何英语语音包；系统 TTS 只作为兜底（iOS 和装了 Google TTS 的设备质量很好）。
 */
import type { Preferences } from './schema'
import { listVoices, speak, stopSpeaking } from './speech'
import type { SpeechFailure } from './speech'

/** 与 scripts/build_audio.py 的 audio_key 保持一致：小写，非字母数字压成下划线。 */
export function audioKey(word: string): string {
  const text = word.trim().toLowerCase().replace(/\u2019/g, "'")
  let key = ''
  for (const char of text) {
    key += /[a-z0-9']/.test(char) ? char : '_'
  }
  return key.replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '')
}

/** 站点内音频地址；BASE_URL 是 './'，所以在 GitHub Pages 子路径下也能解析对。 */
export function bundledAudioUrl(word: string): string | undefined {
  const key = audioKey(word)
  if (!key) return undefined
  return new URL(`audio/${key.slice(0, 2)}/${key}.mp3`, new URL(import.meta.env.BASE_URL, document.baseURI)).href
}

/** 在线兜底发音（词典站点，返回 mp3）。只在既没有自带音频、也没有可用英语语音时使用。 */
export function onlineAudioUrl(word: string): string {
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.trim())}&type=2`
}

export type PronounceSource = 'bundled' | 'tts' | 'online'

export interface PronounceHooks {
  onEnd?: () => void
  onError?: (failure: SpeechFailure) => void
  onSource?: (source: PronounceSource) => void
}

/** 当前正在播放的音频，切题/退出时要能停掉 */
let playing: HTMLAudioElement | undefined

function playUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    playing = audio
    audio.preload = 'auto'
    let done = false
    const settle = (failed: boolean) => {
      if (done) return
      done = true
      audio.onended = null
      audio.onerror = null
      if (playing === audio) playing = undefined
      if (failed) reject(Error('audio failed'))
      else resolve()
    }
    audio.onended = () => settle(false)
    audio.onerror = () => settle(true)
    audio.play().then(() => undefined, () => settle(true))
    // 极少数情况下既不发 ended 也不发 error
    setTimeout(() => { if (!done && (audio.ended || audio.error)) settle(Boolean(audio.error)) }, 15000)
  })
}

/** 停掉正在播放的发音（站点音频和系统 TTS 一起停） */
export function stopPronunciation(): void {
  playing?.pause()
  playing = undefined
  stopSpeaking()
}

/**
 * 朗读一个单词。按设备能力选顺序，逐级降级，全部失败才报错：
 * - 设备有英语语音：系统 TTS 音质更好、不耗流量 → 失败再用站点音频 → 最后在线
 * - 设备没有英语语音（国产安卓常见）：直接用站点自带音频，避免用中文引擎念英文
 */
export function pronounce(word: string, settings: Partial<Preferences>, hooks: PronounceHooks = {}): void {
  let settled = false
  let lastFailure: SpeechFailure = 'no-voice'
  const succeed = (source: PronounceSource) => {
    if (settled) return
    settled = true
    hooks.onSource?.(source)
    hooks.onEnd?.()
  }

  const bundled = async () => {
    const url = bundledAudioUrl(word)
    if (!url) throw Error('no key')
    await playUrl(url)
    succeed('bundled')
  }

  const tts = () => new Promise<void>((resolve, reject) => {
    speak(word, {
      voice: settings.voice, rate: settings.rate, lang: settings.accent,
      onEnd: resolve,
      onError: failure => {
        if (failure === 'canceled' || failure === 'interrupted') return resolve()
        lastFailure = failure
        reject(Error(failure))
      },
    })
  }).then(() => succeed('tts'))

  const online = async () => {
    await playUrl(onlineAudioUrl(word))
    succeed('online')
  }

  const steps = listVoices().length > 0 ? [tts, bundled, online] : [bundled, online]
  void (async () => {
    for (const step of steps) {
      if (settled) return
      try {
        await step()
        if (settled) return
      } catch { /* 试下一级 */ }
    }
    if (!settled) { settled = true; hooks.onError?.(lastFailure) }
  })()
}
