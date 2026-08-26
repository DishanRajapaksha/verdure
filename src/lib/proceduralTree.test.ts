import { describe, expect, it } from 'vitest'
import {
  TREE_MODEL_SPECIES,
  buildDetailedBranchGeometry,
  buildDetailedLeafGeometry,
  generateTreeArchetype,
  getTreePreset,
  treeGeometryStats,
} from './proceduralTree'

describe('detailed procedural trees', () => {
  it('supports every named tree model in the detailed library', () => {
    expect(TREE_MODEL_SPECIES).toHaveLength(16)

    for (const species of TREE_MODEL_SPECIES) {
      const tree = generateTreeArchetype(species, 0)
      expect(getTreePreset(species).name.length).toBeGreaterThan(2)
      expect(tree.stems.length).toBeGreaterThan(2)
      expect(tree.tips.length).toBeGreaterThan(0)
      expect(tree.height).toBeGreaterThan(0)
    }
  })

  it('recreates the same archetype deterministically', () => {
    const first = generateTreeArchetype('white-oak', 1)
    const second = generateTreeArchetype('white-oak', 1)
    expect(second.stems.length).toBe(first.stems.length)
    expect(second.tips.length).toBe(first.tips.length)
    expect(second.stems[0].points[3].toArray()).toEqual(first.stems[0].points[3].toArray())
  })

  it('produces distinct species morphology', () => {
    const oak = generateTreeArchetype('white-oak', 0)
    const pine = generateTreeArchetype('ponderosa-pine', 0)
    const willow = generateTreeArchetype('weeping-willow', 0)
    const joshua = generateTreeArchetype('joshua-tree', 0)

    expect(pine.preset.conifer).toBe(true)
    expect(willow.preset.droop ?? 0).toBeGreaterThan(0)
    expect(joshua.preset.tipCluster).toBe(true)
    expect(pine.preset.leafShape).toBe('needle')
    expect(joshua.preset.leafShape).toBe('tuft')
    expect(pine.crownWidth).not.toBe(oak.crownWidth)
  })

  it('builds tapered branch tubes with roots and wind weights', () => {
    const tree = generateTreeArchetype('american-sycamore', 2)
    const geometry = buildDetailedBranchGeometry(tree)
    const stats = treeGeometryStats(geometry)
    expect(stats.vertices).toBeGreaterThan(500)
    expect(stats.triangles).toBeGreaterThan(500)
    expect(geometry.getAttribute('aWind').count).toBe(stats.vertices)
    expect(tree.stems.some((stem) => stem.root)).toBe(true)
  })

  it('reduces branch cost for distant LOD', () => {
    const tree = generateTreeArchetype('paper-birch', 0)
    const near = treeGeometryStats(
      buildDetailedBranchGeometry(tree, { radialScale: 1, ringStride: 1 }),
    )
    const far = treeGeometryStats(
      buildDetailedBranchGeometry(tree, { radialScale: 0.32, ringStride: 3, maxLevel: 2 }),
    )
    expect(far.triangles).toBeLessThan(near.triangles * 0.7)
  })

  it('uses real leaf cards at every LOD density instead of canopy blobs', () => {
    const tree = generateTreeArchetype('red-maple', 2)
    const nearGeometry = buildDetailedLeafGeometry(tree, { density: 1 })
    const farGeometry = buildDetailedLeafGeometry(tree, { density: 0.22, sizeScale: 1.28 })
    const near = treeGeometryStats(nearGeometry)
    const far = treeGeometryStats(farGeometry)

    expect(near.triangles).toBeGreaterThan(100)
    expect(far.triangles).toBeGreaterThan(0)
    expect(far.triangles).toBeLessThan(near.triangles)
    expect(farGeometry.getAttribute('aWind').count).toBe(far.vertices)
    expect(farGeometry.getAttribute('color').count).toBe(far.vertices)
  })
})
