import {
  forestDensity,
  naturalTerrainHeight,
  riverSampleAt,
  vegetationWetness,
} from './forest'
import type { RiverPoint } from './forest'
import { seedToUint32 } from './noise'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function gustAt(
  x: number,
  z: number,
  time: number,
  seed: string | number,
): number {
  const phase = (seedToUint32(seed) % 8192) * 0.00091
  const weather = Math.pow(0.5 + 0.5 * Math.sin(time * 0.21 + phase), 2.35)
  const front = 0.5 + 0.5 * Math.sin(x * 0.12 + z * 0.07 - time * 0.85 + phase * 1.7)
  const broken = 0.5 + 0.5 * Math.sin(x * 0.31 - z * 0.19 - time * 1.13 + phase * 0.61)
  return clamp01(0.08 + weather * (0.24 + front * 0.58 + broken * 0.18))
}

export function riverFlowSpeedAtIndex(points: RiverPoint[], index: number): number {
  if (points.length < 2) return 0.35
  const safeIndex = Math.min(points.length - 1, Math.max(0, index))
  const previous = points[Math.max(0, safeIndex - 1)]
  const point = points[safeIndex]
  const next = points[Math.min(points.length - 1, safeIndex + 1)]
  const distance = Math.hypot(next.x - previous.x, next.z - previous.z) || 1
  const drop = Math.max(0, previous.waterY - next.waterY)
  const slope = drop / distance
  const neighbourWidth = (previous.width + next.width) * 0.5
  const constriction = clamp01((neighbourWidth - point.width + 0.035) / 0.16)
  const narrowness = clamp01((0.78 - point.width) / 0.42)
  return Math.min(1.85, Math.max(0.28, 0.28 + slope * 29 + constriction * 0.42 + narrowness * 0.2))
}

export function riverAgitation(flowSpeed: number): number {
  return clamp01((flowSpeed - 0.36) / 1.05)
}

export function mistPoolWeight(
  x: number,
  z: number,
  seed: string | number,
  size = 40,
): number {
  const centre = naturalTerrainHeight(x, z, seed)
  const radius = 3.2
  const neighbours = [
    naturalTerrainHeight(x + radius, z, seed),
    naturalTerrainHeight(x - radius, z, seed),
    naturalTerrainHeight(x, z + radius, seed),
    naturalTerrainHeight(x, z - radius, seed),
    naturalTerrainHeight(x + radius * 0.7, z + radius * 0.7, seed),
    naturalTerrainHeight(x - radius * 0.7, z - radius * 0.7, seed),
  ]
  const average = neighbours.reduce((sum, value) => sum + value, 0) / neighbours.length
  const depression = clamp01((average - centre + 0.08) / 0.72)
  const lowland = clamp01(0.58 - centre * 0.18)
  const wetness = vegetationWetness(x, z, seed)
  const river = riverSampleAt(x, z, seed, size)
  const riverInfluence = clamp01(1 - river.distance / Math.max(0.4, river.bankWidth * 3.1))
  return clamp01(depression * 0.43 + wetness * 0.26 + riverInfluence * 0.21 + lowland * 0.1)
}

export function fireflyHabitatScore(
  x: number,
  z: number,
  seed: string | number,
  size = 40,
): number {
  const density = forestDensity(x, z, seed)
  const wetness = vegetationWetness(x, z, seed)
  const river = riverSampleAt(x, z, seed, size)
  const riverInfluence = clamp01(1 - river.distance / Math.max(0.4, river.bankWidth * 3.4))
  const clearingEdge = clamp01(1 - Math.abs(density - 0.52) / 0.48)
  const shade = clamp01((density - 0.18) / 0.72)
  const mist = mistPoolWeight(x, z, seed, size)
  return clamp01(wetness * 0.36 + clearingEdge * 0.2 + shade * 0.18 + riverInfluence * 0.16 + mist * 0.1)
}

export function waterInsectHabitatScore(points: RiverPoint[], index: number): number {
  const point = points[Math.min(points.length - 1, Math.max(0, index))]
  if (!point) return 0
  const flow = riverFlowSpeedAtIndex(points, index)
  const calm = clamp01(1 - Math.abs(flow - 0.58) / 0.72)
  const width = clamp01((point.width - 0.42) / 0.4)
  return clamp01(calm * 0.72 + width * 0.28)
}
