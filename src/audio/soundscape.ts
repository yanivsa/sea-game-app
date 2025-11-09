import type { WeatherState } from '../game/types'

export interface Soundscape {
  ctx: AudioContext
  oceanGain: GainNode
  windGain: GainNode
  pulseGain: GainNode
}

export const createSoundscape = (): Soundscape | null => {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  const ctx = new AudioContext()
  const oceanGain = ctx.createGain()
  const windGain = ctx.createGain()
  const pulseGain = ctx.createGain()
  oceanGain.connect(ctx.destination)
  windGain.connect(ctx.destination)
  pulseGain.connect(ctx.destination)

  const createNoise = (gain: GainNode, frequency: number) => {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = 0.8
    source.loop = true
    source.connect(filter)
    filter.connect(gain)
    source.start()
  }

  createNoise(oceanGain, 220)
  createNoise(windGain, 50)

  return { ctx, oceanGain, windGain, pulseGain }
}

export const applyWeatherToSoundscape = (
  soundscape: Soundscape,
  weather: WeatherState,
) => {
  if (!soundscape) return
  soundscape.oceanGain.gain.linearRampToValueAtTime(0.3 * weather.waveStrength, soundscape.ctx.currentTime + 1)
  soundscape.windGain.gain.linearRampToValueAtTime(0.15 + weather.ambientGain * 0.1, soundscape.ctx.currentTime + 1)
}
