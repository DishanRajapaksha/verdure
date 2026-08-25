import { useEffect, useMemo, useState } from 'react'
import { VerdureScene } from './scene/VerdureScene'
import { useAmbientAudio } from './hooks/useAmbientAudio'

export type ExperienceMode = 'specimen' | 'immersed'

function seedFromLocation(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('seed')?.trim() || 'verdure-01'
}

function newSeed(): string {
  const bytes = new Uint32Array(2)
  crypto.getRandomValues(bytes)
  return `${bytes[0].toString(36)}${bytes[1].toString(36)}`
}

export function App() {
  const [mode, setMode] = useState<ExperienceMode>('specimen')
  const [seed, setSeed] = useState(seedFromLocation)
  const [sound, setSound] = useState(false)
  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useAmbientAudio(sound && mode === 'immersed')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mode === 'immersed') setMode('specimen')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode])

  const regenerate = () => {
    const nextSeed = newSeed()
    setSeed(nextSeed)
    const url = new URL(window.location.href)
    url.searchParams.set('seed', nextSeed)
    window.history.replaceState({}, '', url)
  }

  return (
    <main className={`experience experience--${mode} ${reducedMotion ? 'reduce-motion' : ''}`}>
      <div className="scene" aria-hidden="true">
        <VerdureScene mode={mode} seed={seed} />
      </div>

      <header className="chrome chrome--top">
        <button className="wordmark" onClick={() => setMode('specimen')} aria-label="Return to specimen view">
          Verdure
        </button>
        <div className="quiet-controls">
          <button onClick={regenerate}>new specimen</button>
          <button onClick={() => setSound((value) => !value)} aria-pressed={sound}>
            sound {sound ? 'on' : 'off'}
          </button>
          {mode === 'immersed' && <button onClick={() => setMode('specimen')}>surface</button>}
        </div>
      </header>

      <section className={`invitation ${mode === 'immersed' ? 'invitation--hidden' : ''}`} aria-live="polite">
        <p>A forest inside a stone.</p>
        <button className="enter" onClick={() => setMode('immersed')}>
          Enter the forest
        </button>
      </section>

      <footer className="chrome chrome--bottom">
        <span>{mode === 'specimen' ? 'move the pointer to turn the specimen' : 'drag to wander · esc to surface'}</span>
        <span className="seed" title="This seed reproduces the same forest">seed {seed}</span>
      </footer>
    </main>
  )
}
