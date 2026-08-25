import { describe, expect, it } from 'vitest'
import {
  forestDensity,
  generateForest,
  generateUnderstory,
  terrainHeight,
  vegetationWetness,
} from './forest'
import { seedToUint32 } from './noise'

describe('procedural world', () => {
  it('hashes string seeds deterministically', () => {
    expect(seedToUint32('verdure')).toBe(seedToUint32('verdure'))
    expect(seedToUint32('verdure')).not.toBe(seedToUint32('another-world'))
  })

  it('recreates the same forest from the same seed', () => {
    const first = generateForest('mosslight', 18)
    const second = generateForest('mosslight', 18)
    expect(second).toEqual(first)
  })

  it('recreates the same understory from the same seed', () => {
    const first = generateUnderstory('mosslight', 18)
    const second = generateUnderstory('mosslight', 18)
    expect(second).toEqual(first)
  })

  it('changes the specimen when the seed changes', () => {
    const first = generateForest('mosslight', 18)
    const second = generateForest('greenveil', 18)
    expect(second.slice(0, 8)).not.toEqual(first.slice(0, 8))
  })

  it('produces multiple tree and ground-cover forms', () => {
    const trees = generateForest('mosslight', 30)
    const plants = generateUnderstory('mosslight', 30)
    expect(new Set(trees.map((tree) => tree.species)).size).toBeGreaterThanOrEqual(2)
    expect(new Set(plants.map((plant) => plant.kind)).size).toBeGreaterThanOrEqual(3)
  })

  it('keeps generated fields inside sensible bounds', () => {
    for (let x = -10; x <= 10; x += 2) {
      for (let z = -10; z <= 10; z += 2) {
        expect(forestDensity(x, z, 'bounds')).toBeGreaterThanOrEqual(0)
        expect(forestDensity(x, z, 'bounds')).toBeLessThanOrEqual(1)
        expect(vegetationWetness(x, z, 'bounds')).toBeGreaterThanOrEqual(0)
        expect(vegetationWetness(x, z, 'bounds')).toBeLessThanOrEqual(1)
        expect(Math.abs(terrainHeight(x, z, 'bounds'))).toBeLessThan(3)
      }
    }
  })
})
