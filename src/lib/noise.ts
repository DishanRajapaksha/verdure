export function seedToUint32(seed: string | number): number {
  if (typeof seed === 'number') return seed >>> 0

  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function mulberry32(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function fade(value: number): number {
  return value * value * (3 - 2 * value)
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount
}

function lattice(seed: number, x: number, y: number): number {
  let value = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1)
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b)
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35)
  value ^= value >>> 16
  return (value >>> 0) / 4294967295
}

export function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = fade(x - x0)
  const ty = fade(y - y0)

  const a = lattice(seed, x0, y0)
  const b = lattice(seed, x0 + 1, y0)
  const c = lattice(seed, x0, y0 + 1)
  const d = lattice(seed, x0 + 1, y0 + 1)

  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty)
}

export function fbm2D(
  x: number,
  y: number,
  seed: number,
  octaves = 5,
  lacunarity = 2.03,
  gain = 0.5,
): number {
  let amplitude = 0.5
  let frequency = 1
  let total = 0
  let normaliser = 0

  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise2D(x * frequency, y * frequency, seed + octave * 1013) * amplitude
    normaliser += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }

  return total / normaliser
}

export function ridge2D(x: number, y: number, seed: number): number {
  return 1 - Math.abs(fbm2D(x, y, seed) * 2 - 1)
}
