import { describe, expect, it } from 'vitest'
import { audioKey } from './audio'

describe('audioKey', () => {
  it('matches the file names produced by scripts/build_audio.py', () => {
    expect(audioKey('sustain')).toBe('sustain')
    expect(audioKey('Sustain')).toBe('sustain')
    expect(audioKey(' ice cream ')).toBe('ice_cream')
    expect(audioKey('adapt')).toBe('adapt')
  })

  it('keeps apostrophes and collapses everything else into single underscores', () => {
    expect(audioKey("don't")).toBe("don't")
    expect(audioKey('don\u2019t')).toBe("don't")
    expect(audioKey('co-op')).toBe('co_op')
    expect(audioKey('a   b')).toBe('a_b')
    expect(audioKey('  --X--  ')).toBe('x')
  })
})
