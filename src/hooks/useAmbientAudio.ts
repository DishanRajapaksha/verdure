import { useEffect } from 'react'

export function useAmbientAudio(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    const AudioContextCtor = window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return

    const context = new AudioContextCtor()
    const master = context.createGain()
    master.gain.value = 0.055
    master.connect(context.destination)

    const seconds = 4
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate)
    const data = buffer.getChannelData(0)
    let brown = 0

    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1
      brown = (brown + 0.018 * white) / 1.018
      data[index] = brown * 2.4
    }

    const wind = context.createBufferSource()
    wind.buffer = buffer
    wind.loop = true

    const lowPass = context.createBiquadFilter()
    lowPass.type = 'lowpass'
    lowPass.frequency.value = 520
    lowPass.Q.value = 0.55

    const windGain = context.createGain()
    windGain.gain.value = 0.5
    wind.connect(lowPass).connect(windGain).connect(master)

    const lfo = context.createOscillator()
    const lfoGain = context.createGain()
    lfo.frequency.value = 0.075
    lfoGain.gain.value = 0.18
    lfo.connect(lfoGain).connect(windGain.gain)

    const water = context.createOscillator()
    const waterGain = context.createGain()
    const waterFilter = context.createBiquadFilter()
    water.type = 'sine'
    water.frequency.value = 73
    waterGain.gain.value = 0.012
    waterFilter.type = 'lowpass'
    waterFilter.frequency.value = 180
    water.connect(waterFilter).connect(waterGain).connect(master)

    void context.resume()
    wind.start()
    lfo.start()
    water.start()

    return () => {
      wind.stop()
      lfo.stop()
      water.stop()
      void context.close()
    }
  }, [enabled])
}
