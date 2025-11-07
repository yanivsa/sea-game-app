type Wave = OscillatorType

export interface AudioBus {
  ctx: AudioContext
  master: GainNode
}

export const createAudioBus = (): AudioBus | null => {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = 0.5
  master.connect(ctx.destination)
  return { ctx, master }
}

const env = (ctx: AudioContext, node: GainNode, t: number, a = 0.005, d = 0.12) => {
  const g = node.gain
  const now = ctx.currentTime
  g.cancelScheduledValues(now)
  g.setValueAtTime(0.0001, now)
  g.linearRampToValueAtTime(1, now + a)
  g.exponentialRampToValueAtTime(0.001, now + Math.max(a + d, t))
}

const osc = (bus: AudioBus, freq: number, dur: number, wave: Wave = 'sine', volume = 0.8) => {
  const { ctx, master } = bus
  const gain = ctx.createGain()
  gain.gain.value = volume
  const o = ctx.createOscillator()
  o.type = wave
  o.frequency.value = freq
  o.connect(gain)
  gain.connect(master)
  env(ctx, gain, dur)
  o.start()
  o.stop(ctx.currentTime + dur)
}

const chirp = (
  bus: AudioBus,
  startHz: number,
  endHz: number,
  dur: number,
  wave: Wave = 'sine',
  volume = 0.7,
) => {
  const { ctx, master } = bus
  const gain = ctx.createGain()
  gain.gain.value = volume
  const o = ctx.createOscillator()
  o.type = wave
  o.frequency.setValueAtTime(startHz, ctx.currentTime)
  o.frequency.exponentialRampToValueAtTime(endHz, ctx.currentTime + dur)
  o.connect(gain)
  gain.connect(master)
  env(ctx, gain, dur)
  o.start()
  o.stop(ctx.currentTime + dur)
}

const noise = (bus: AudioBus, dur: number, volume = 0.15) => {
  const { ctx, master } = bus
  const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.value = volume
  src.connect(gain)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 350
  bp.Q.value = 0.6
  gain.connect(bp)
  bp.connect(master)
  env(ctx, gain, dur, 0.005, dur * 0.8)
  src.start()
}

export const sfx = {
  scan(bus: AudioBus) {
    chirp(bus, 240, 1200, 0.18, 'triangle', 0.5)
  },
  sonar(bus: AudioBus) {
    chirp(bus, 900, 200, 0.32, 'sine', 0.4)
  },
  strike(bus: AudioBus) {
    chirp(bus, 140, 80, 0.12, 'square', 0.5)
    noise(bus, 0.06, 0.08)
  },
  hit(bus: AudioBus) {
    osc(bus, 880, 0.12, 'sine', 0.55)
  },
  spawn(bus: AudioBus) {
    osc(bus, 660, 0.09, 'triangle', 0.4)
    setTimeout(() => osc(bus, 760, 0.09, 'triangle', 0.4), 110)
  },
  dive(bus: AudioBus) {
    chirp(bus, 300, 900, 0.18, 'sine', 0.35)
  },
  surface(bus: AudioBus) {
    chirp(bus, 900, 300, 0.2, 'sine', 0.35)
  },
  located(bus: AudioBus) {
    osc(bus, 740, 0.12, 'sine', 0.5)
    setTimeout(() => osc(bus, 990, 0.14, 'sine', 0.5), 120)
  },
  pickup(bus: AudioBus) {
    osc(bus, 660, 0.08, 'triangle', 0.45)
    setTimeout(() => osc(bus, 880, 0.1, 'triangle', 0.45), 90)
    setTimeout(() => osc(bus, 1100, 0.12, 'triangle', 0.45), 200)
  },
  victory(bus: AudioBus) {
    osc(bus, 523.25, 0.12, 'sine', 0.5) // C5
    setTimeout(() => osc(bus, 659.25, 0.12, 'sine', 0.5), 120) // E5
    setTimeout(() => osc(bus, 783.99, 0.18, 'sine', 0.5), 240) // G5
    setTimeout(() => osc(bus, 1046.5, 0.3, 'sine', 0.55), 420) // C6
  },
  fail(bus: AudioBus) {
    osc(bus, 180, 0.2, 'sawtooth', 0.35)
    setTimeout(() => osc(bus, 140, 0.25, 'sawtooth', 0.3), 220)
  },
}

// Ambient waves (low, subtle)
export const startAmbient = (bus: AudioBus) => {
  const { ctx, master } = bus
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 500
  const gain = ctx.createGain()
  gain.gain.value = 0.08
  src.connect(lp)
  lp.connect(gain)
  gain.connect(master)
  src.start()
  return { stop: () => src.stop() }
}

