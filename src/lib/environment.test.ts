import { describe, expect, it } from 'vitest'
import type { RiverPoint } from './forest'
import {
  fireflyHabitatScore,
  gustAt,
  mistPoolWeight,
  riverAgitation,
  riverFlowSpeedAtIndex,
  waterInsectHabitatScore,
} from './environment'

const flatRiver: RiverPoint[] = [
  { x: 0, z: 0, terrainY: 1, waterY: 0.9, width: 0.62, depth: 0.25 },
  { x: 1, z: 0, terrainY: 0.99, waterY: 0.895, width: 0.62, depth: 0.25 },
  { x: 2, z: 0, terrainY: 0.98, waterY: 0.89, width: 0.62, depth: 0.25 },
]

const steepRiver: RiverPoint[] = [
  { x: 0, z: 0, terrainY: 1.4, waterY: 1.2, width: 0.56, depth: 0.28 },
  { x: 1, z: 0, terrainY: 1.0, waterY: 0.9, width: 0.5, depth: 0.28 },
  { x: 2, z: 0, terrainY: 0.55, waterY: 0.48, width: 0.54, depth: 0.3 },
]

describe('environment coupling', () => {
  it('produces deterministic travelling gusts in sensible bounds', () => {
    const first = gustAt(4.2, -3.1, 12.5, 'verdure')
    const second = gustAt(4.2, -3.1, 12.5, 'verdure')
    expect(second).toBe(first)
    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThanOrEqual(1)
    expect(gustAt(4.2, -3.1, 19.5, 'verdure')).not.toBe(first)
  })

  it('maps steeper, narrower channels to faster and more agitated flow', () => {
    const flat = riverFlowSpeedAtIndex(flatRiver, 1)
    const steep = riverFlowSpeedAtIndex(steepRiver, 1)
    expect(steep).toBeGreaterThan(flat)
    expect(riverAgitation(steep)).toBeGreaterThan(riverAgitation(flat))
  })

  it('keeps habitat and mist fields bounded', () => {
    for (let x = -8; x <= 8; x += 4) {
      for (let z = -8; z <= 8; z += 4) {
        const mist = mistPoolWeight(x, z, 'habitat', 30)
        const firefly = fireflyHabitatScore(x, z, 'habitat', 30)
        expect(mist).toBeGreaterThanOrEqual(0)
        expect(mist).toBeLessThanOrEqual(1)
        expect(firefly).toBeGreaterThanOrEqual(0)
        expect(firefly).toBeLessThanOrEqual(1)
      }
    }
  })

  it('prefers calmer river habitat for water insects', () => {
    expect(waterInsectHabitatScore(flatRiver, 1)).toBeGreaterThan(
      waterInsectHabitatScore(steepRiver, 1),
    )
  })
})
