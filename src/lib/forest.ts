import { fbm2D, mulberry32, ridge2D, seedToUint32 } from './noise'

export type TreePlacement = {
  x: number
  y: number
  z: number
  height: number
  girth: number
  rotation: number
  canopy: number
  tint: number
}

export type RockPlacement = {
  x: number
  y: number
  z: number
  scale: number
  rotation: number
  tint: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function terrainHeight(x: number, z: number, seed: string | number): number {
  const s = seedToUint32(seed)
  const broad = fbm2D(x * 0.035, z * 0.035, s ^ 0xa17c9e21, 5)
  const detail = fbm2D(x * 0.11, z * 0.11, s ^ 0x61e39ac7, 4)
  const ridge = ridge2D(x * 0.045, z * 0.045, s ^ 0x4b1d3e55)
  return (broad - 0.5) * 2.6 + (detail - 0.5) * 0.65 + (ridge - 0.55) * 0.45
}

export function forestDensity(x: number, z: number, seed: string | number): number {
  const s = seedToUint32(seed)
  const broad = fbm2D(x * 0.047, z * 0.047, s ^ 0x73a52f91, 5)
  const broken = fbm2D(x * 0.14, z * 0.14, s ^ 0x18d9c5ab, 3)
  const clearings = ridge2D(x * 0.026 + 7.2, z * 0.026 - 4.1, s ^ 0xc11f45d3)

  const clustered = broad * 0.72 + broken * 0.28
  const clearingMask = 0.72 + clearings * 0.34
  return clamp01((clustered * clearingMask - 0.34) * 1.65)
}

export function generateForest(seed: string | number, size = 40): TreePlacement[] {
  const s = seedToUint32(seed)
  const random = mulberry32(s ^ 0x9e3779b9)
  const spacing = 1.18
  const half = size / 2
  const trees: TreePlacement[] = []

  for (let z = -half; z <= half; z += spacing) {
    for (let x = -half; x <= half; x += spacing) {
      const px = x + (random() - 0.5) * spacing * 0.88
      const pz = z + (random() - 0.5) * spacing * 0.88
      const density = forestDensity(px, pz, s)

      if (random() > density * 0.82) continue

      const age = Math.pow(random(), 0.7)
      const height = 1.45 + age * 2.75 + density * 0.75
      trees.push({
        x: px,
        y: terrainHeight(px, pz, s),
        z: pz,
        height,
        girth: 0.72 + random() * 0.65,
        rotation: random() * Math.PI * 2,
        canopy: 0.78 + random() * 0.48 + density * 0.2,
        tint: clamp01(density * 0.72 + random() * 0.32),
      })
    }
  }

  return trees
}

export function generateRocks(seed: string | number, size = 40, count = 120): RockPlacement[] {
  const s = seedToUint32(seed)
  const random = mulberry32(s ^ 0x4d6b3a21)
  const half = size / 2
  const rocks: RockPlacement[] = []

  for (let index = 0; index < count; index += 1) {
    const x = (random() * 2 - 1) * half
    const z = (random() * 2 - 1) * half
    rocks.push({
      x,
      y: terrainHeight(x, z, s) - 0.05,
      z,
      scale: 0.18 + Math.pow(random(), 2) * 0.72,
      rotation: random() * Math.PI * 2,
      tint: random(),
    })
  }

  return rocks
}
