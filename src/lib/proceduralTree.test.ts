import { describe, expect, it } from 'vitest'
import {
  buildDetailedBranchGeometry,
  buildDetailedLeafGeometry,
  generateTreeArchetype,
  treeGeometryStats,
} from './proceduralTree'

describe('detailed procedural trees', () => {
  it('recreates the same archetype deterministically', () => {
    const first = generateTreeArchetype('broadleaf', 1)
    const second = generateTreeArchetype('broadleaf', 1)
    expect(second.stems.length).toBe(first.stems.length)
    expect(second.tips.length).toBe(first.tips.length)
    expect(second.stems[0].points[3].toArray()).toEqual(first.stems[0].points[3].toArray())
  })

  it('produces distinct species morphology', () => {
    const oak = generateTreeArchetype('broadleaf', 0)
    const pine = generateTreeArchetype('conifer', 0)
    const ancient = generateTreeArchetype('ancient', 0)
    expect(pine.preset.conifer).toBe(true)
    expect(ancient.preset.trunkRadius).toBeGreaterThan(oak.preset.trunkRadius)
    expect(pine.crownWidth).not.toBe(oak.crownWidth)
  })

  it('builds tapered branch tubes with roots and wind weights', () => {
    const tree = generateTreeArchetype('ancient', 2)
    const geometry = buildDetailedBranchGeometry(tree)
    const stats = treeGeometryStats(geometry)
    expect(stats.vertices).toBeGreaterThan(500)
    expect(stats.triangles).toBeGreaterThan(500)
    expect(geometry.getAttribute('aWind').count).toBe(stats.vertices)
    expect(tree.stems.some((stem) => stem.root)).toBe(true)
  })

  it('reduces branch cost for distant LOD', () => {
    const tree = generateTreeArchetype('silverleaf', 0)
    const near = treeGeometryStats(buildDetailedBranchGeometry(tree, { radialScale: 1, ringStride: 1 }))
    const far = treeGeometryStats(buildDetailedBranchGeometry(tree, { radialScale: 0.42, ringStride: 3, maxLevel: 1 }))
    expect(far.triangles).toBeLessThan(near.triangles * 0.45)
  })

  it('uses individual leaf cards near the viewer and fewer cards at mid LOD', () => {
    const tree = generateTreeArchetype('broadleaf', 2)
    const near = treeGeometryStats(buildDetailedLeafGeometry(tree, { density: 1 }))
    const mid = treeGeometryStats(buildDetailedLeafGeometry(tree, { density: 0.5 }))
    expect(near.triangles).toBeGreaterThan(100)
    expect(mid.triangles).toBeLessThan(near.triangles)
  })
})
