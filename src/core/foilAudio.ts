let context: AudioContext | undefined
let paper: AudioBuffer | undefined
let lastScrape = 0

function audio() {
  if (typeof AudioContext === 'undefined') return undefined
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume().catch(() => undefined)
    return context
  } catch {
    return undefined
  }
}

export function foilSound(kind: 'touch' | 'scrape' | 'open' | 'resonate', activity = 0.4) {
  const ctx = audio()
  if (!ctx || kind === 'touch') return
  const start = ctx.currentTime
  if (kind === 'resonate') {
    for (const [index, hz] of [329.63, 440, 659.25].entries()) {
      const tone = ctx.createOscillator()
      const volume = ctx.createGain()
      const at = start + index * 0.075
      tone.frequency.value = hz
      volume.gain.setValueAtTime(0.001, at)
      volume.gain.exponentialRampToValueAtTime(0.028, at + 0.025)
      volume.gain.exponentialRampToValueAtTime(0.001, at + 0.36)
      tone.connect(volume).connect(ctx.destination)
      tone.start(at)
      tone.stop(at + 0.38)
      tone.onended = () => volume.disconnect()
    }
    return
  }
  if (kind === 'scrape' && start - lastScrape < 0.085) return
  lastScrape = start
  if (!paper) {
    paper = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.35), ctx.sampleRate)
    const samples = paper.getChannelData(0)
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      sum = 0.42 * sum + (Math.random() * 2 - 1)
      samples[i] = Math.tanh(sum)
    }
  }
  const duration = kind === 'open' ? 0.26 : 0.075
  const source = ctx.createBufferSource()
  source.buffer = paper
  source.playbackRate.value = 0.9 + activity * 0.35
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = kind === 'open' ? 1800 : 1100 + 1900 * activity
  filter.Q.value = 0.65
  const volume = ctx.createGain()
  volume.gain.setValueAtTime(0.001, start)
  volume.gain.exponentialRampToValueAtTime(kind === 'open' ? 0.2 : 0.035 + 0.025 * activity, start + 0.014)
  volume.gain.exponentialRampToValueAtTime(0.001, start + duration)
  source.connect(filter).connect(volume).connect(ctx.destination)
  source.start(start)
  source.stop(start + duration)
  source.onended = () => { filter.disconnect(); volume.disconnect() }
}

