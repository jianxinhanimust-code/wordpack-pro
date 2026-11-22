import { describe, expect, it } from 'vitest'
import { classifySpeechError, speechFailureText, speechNeedsSetup } from './speech'
import type { SpeechFailure } from './speech'

describe('classifySpeechError', () => {
  it('separates the three cases that used to share one message', () => {
    // 设备没有英语语音包
    expect(classifySpeechError('synthesis-failed', 0)).toBe('no-voice')
    expect(classifySpeechError('language-unavailable', 0)).toBe('language-unavailable')
    // 引擎在
    expect(classifySpeechError('synthesis-failed', 3)).toBe('synthesis-failed')
    // 浏览器拦了非手势调用
    expect(classifySpeechError('not-allowed', 3)).toBe('not-allowed')
  })

  it('keeps normal interruptions out of the error path', () => {
    expect(classifySpeechError('canceled', 3)).toBe('canceled')
    expect(classifySpeechError('interrupted', 3)).toBe('interrupted')
  })

  it('maps the remaining engine errors and never returns an empty reason', () => {
    expect(classifySpeechError('audio-busy', 3)).toBe('audio-busy')
    expect(classifySpeechError('network', 3)).toBe('network')
    expect(classifySpeechError('voice-unavailable', 3)).toBe('language-unavailable')
    expect(classifySpeechError('synthesis-unavailable', 3)).toBe('synthesis-failed')
    expect(classifySpeechError('', 3)).toBe('unknown')
    expect(classifySpeechError('something-new', 0)).toBe('unknown')
  })
})

describe('speech messages', () => {
  it('has a message for every reason', () => {
    const reasons: SpeechFailure[] = ['unsupported', 'no-voice', 'language-unavailable', 'not-allowed',
      'synthesis-failed', 'audio-busy', 'network', 'canceled', 'interrupted', 'unknown']
    for (const reason of reasons) expect(speechFailureText[reason].length).toBeGreaterThan(4)
  })

  it('only appends the install-a-voice hint when the device is missing English', () => {
    expect(speechNeedsSetup('no-voice')).toBe(true)
    expect(speechNeedsSetup('language-unavailable')).toBe(true)
    expect(speechNeedsSetup('synthesis-failed')).toBe(false)
    expect(speechNeedsSetup('not-allowed')).toBe(false)
    expect(speechNeedsSetup('canceled')).toBe(false)
  })
})
