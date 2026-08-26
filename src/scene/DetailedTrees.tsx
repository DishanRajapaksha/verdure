import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TreePlacement, TreeSpecies } from '../lib/forest'
import { mulberry32, seedToUint32 } from '../lib/noise'
import {
  buildDetailedBranchGeometry,
  buildDetailedLeafGeometry,
  generateTreeArchetype,
  getTreePreset,
  type LeafShape,
  type TreeModelSpecies,
} from '../lib/proceduralTree'
import { TreeWindMaterial } from './TreeWindMaterial'

const VARIANT_COUNT = 3

const MODEL_POOLS: Record<TreeSpecies, TreeModelSpecies[]> = {
  broadleaf: [
    'white-oak',
    'red-maple',
    'tulip-poplar',
    'sweetgum',
    'american-beech',
    'cultivated-apple',
    'sweet-cherry',
    'american-sycamore',
    'flowering-dogwood',
    'weeping-willow',
  ],
  silverleaf: ['paper-birch', 'quaking-aspen'],
  conifer: ['ponderosa-pine', 'loblolly-pine', 'douglas-fir'],
  ancient: ['white-oak', 'american-sycamore', 'american-beech', 'weeping-willow'],
}

export function detailedModelForTree(tree: TreePlacement): TreeModelSpecies {
  const pool = MODEL_POOLS[tree.species]
  const hash = Math.abs(
    Math.floor(
      tree.x * 193.7
        + tree.z * 389.1
        + tree.tint * 997.3
        + tree.height * 149.9
        + tree.girth * 271.1,
    ),
  )
  return pool[hash % pool.length]
}

function variantForTree(tree: TreePlacement): number {
  const hash = Math.abs(
    Math.floor(tree.x * 311.3 + tree.z * 173.9 + tree.tint * 881.7 + tree.rotation * 97.1),
  )
  return hash % VARIANT_COUNT
}

function makeBarkTexture(species: TreeModelSpecies): THREE.CanvasTexture {
  const preset = getTreePreset(species)
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const context = canvas.getContext('2d')!
  const random = mulberry32(seedToUint32(`${species}:bark-texture`))
  const base = new THREE.Color(preset.bark)
  const accent = new THREE.Color(preset.barkAccent)
  const highlight = base.clone().lerp(new THREE.Color('#ddd2bd'), 0.24)

  context.fillStyle = `#${base.getHexString()}`
  context.fillRect(0, 0, canvas.width, canvas.height)

  const fissures = preset.conifer ? 54 : species === 'paper-birch' || species === 'quaking-aspen' ? 28 : 44
  for (let line = 0; line < fissures; line += 1) {
    const x = random() * canvas.width
    const width = 0.5 + random() * (preset.conifer ? 3.5 : 2.8)
    const phase = random() * Math.PI * 2
    context.beginPath()
    for (let y = -8; y <= canvas.height + 8; y += 7) {
      const frequency = 0.035 + random() * 0.025
      const wobble = Math.sin(y * frequency + phase) * (0.8 + random() * (preset.gnarl ?? 2.5) * 0.55)
      if (y === -8) context.moveTo(x + wobble, y)
      else context.lineTo(x + wobble, y)
    }
    context.strokeStyle = line % 5 === 0 ? `#${highlight.getHexString()}` : `#${accent.getHexString()}`
    context.globalAlpha = line % 5 === 0 ? 0.22 : 0.32 + random() * 0.33
    context.lineWidth = width
    context.stroke()
  }

  if (species === 'paper-birch' || species === 'quaking-aspen') {
    context.globalAlpha = 0.34
    for (let mark = 0; mark < 52; mark += 1) {
      const y = random() * canvas.height
      const x = random() * canvas.width
      const width = 4 + random() * 22
      context.fillStyle = `#${accent.getHexString()}`
      context.fillRect(x, y, width, 0.7 + random() * 1.6)
    }
  }

  context.globalAlpha = 0.14
  for (let fleck = 0; fleck < 220; fleck += 1) {
    context.fillStyle = fleck % 2 === 0 ? `#${accent.getHexString()}` : `#${highlight.getHexString()}`
    context.fillRect(random() * canvas.width, random() * canvas.height, 0.6 + random() * 2, 0.8 + random() * 5)
  }
  context.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.25, 1)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

function drawBroadleaf(context: CanvasRenderingContext2D, shape: LeafShape) {
  context.fillStyle = '#ffffff'
  context.strokeStyle = 'rgba(70,82,58,0.42)'
  context.lineJoin = 'round'

  if (shape === 'round') {
    context.beginPath()
    context.ellipse(64, 60, 35, 45, 0, 0, Math.PI * 2)
    context.fill()
  } else if (shape === 'heart') {
    context.beginPath()
    context.moveTo(64, 116)
    context.bezierCurveTo(49, 93, 24, 79, 28, 51)
    context.bezierCurveTo(31, 27, 52, 27, 64, 42)
    context.bezierCurveTo(76, 27, 97, 27, 100, 51)
    context.bezierCurveTo(104, 79, 79, 93, 64, 116)
    context.fill()
  } else if (shape === 'lobed') {
    const points = [
      [64, 8], [72, 35], [93, 22], [88, 48], [112, 49], [91, 66],
      [105, 91], [75, 84], [64, 118], [53, 84], [23, 91], [37, 66],
      [16, 49], [40, 48], [35, 22], [56, 35],
    ]
    context.beginPath()
    points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y))
    context.closePath()
    context.fill()
  } else if (shape === 'willow') {
    context.beginPath()
    context.moveTo(64, 118)
    context.bezierCurveTo(43, 86, 43, 43, 62, 8)
    context.bezierCurveTo(78, 43, 80, 87, 64, 118)
    context.fill()
  } else {
    context.beginPath()
    context.moveTo(64, 116)
    context.bezierCurveTo(34, 98, 24, 67, 38, 40)
    context.bezierCurveTo(48, 20, 59, 12, 64, 9)
    context.bezierCurveTo(74, 15, 91, 29, 97, 49)
    context.bezierCurveTo(104, 76, 90, 101, 64, 116)
    context.fill()
  }

  context.lineWidth = 2
  context.beginPath()
  context.moveTo(64, 112)
  context.lineTo(64, 22)
  context.stroke()
  context.lineWidth = 1
  for (let index = 0; index < 5; index += 1) {
    const y = 89 - index * 13
    const spread = shape === 'willow' ? 8 : 17 - index * 1.4
    context.beginPath()
    context.moveTo(64, y)
    context.lineTo(64 - spread, y - 9)
    context.moveTo(64, y - 1)
    context.lineTo(64 + spread, y - 10)
    context.stroke()
  }
}

function drawNeedleSpray(context: CanvasRenderingContext2D, tuft: boolean) {
  context.strokeStyle = '#ffffff'
  context.lineCap = 'round'
  context.lineWidth = tuft ? 3.2 : 4
  context.beginPath()
  context.moveTo(64, 116)
  context.lineTo(64, tuft ? 44 : 13)
  context.stroke()

  const needles = tuft ? 20 : 18
  for (let index = 0; index < needles; index += 1) {
    const t = index / Math.max(1, needles - 1)
    const y = tuft ? 74 - t * 46 : 105 - index * 5.1
    const width = tuft ? 18 + t * 31 : 15 + (1 - t) * 25
    const sweep = tuft ? 18 + t * 15 : 9 + (index % 2) * 3
    context.lineWidth = tuft ? 2.4 : 2.1 + (index % 3) * 0.35
    context.beginPath()
    context.moveTo(64, y)
    context.lineTo(64 - width, y - sweep)
    context.moveTo(64, y + 1)
    context.lineTo(64 + width, y - sweep + (index % 3) * 2)
    context.stroke()
  }
}

function makeLeafTexture(species: TreeModelSpecies): THREE.CanvasTexture {
  const preset = getTreePreset(species)
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, 128, 128)

  if (preset.leafShape === 'needle') drawNeedleSpray(context, false)
  else if (preset.leafShape === 'tuft') drawNeedleSpray(context, true)
  else drawBroadleaf(context, preset.leafShape)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

type PreparedTree = {
  tree: TreePlacement
  matrix: THREE.Matrix4
  branchColour: THREE.Color
  leafColour: THREE.Color
}

function prepareTrees(
  trees: TreePlacement[],
  species: TreeModelSpecies,
  archetypeHeight: number,
): PreparedTree[] {
  const preset = getTreePreset(species)
  const barkTint = new THREE.Color(preset.bark).lerp(new THREE.Color('#ffffff'), 0.16)
  const leafBase = new THREE.Color(preset.leaf)
  const leafAccent = new THREE.Color(preset.leafAccent)
  return trees.map((tree) => {
    const position = new THREE.Vector3(tree.x, tree.y, tree.z)
    const quaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(tree.lean * 0.2, tree.rotation, tree.lean * 0.72, 'YXZ'),
    )
    const heightScale = tree.height / Math.max(0.25, archetypeHeight)
    const habitatWidth = 0.83 + (tree.canopy - 0.78) * 0.25 + (tree.girth - 0.72) * 0.045
    const widthScale = heightScale * habitatWidth
    const scale = new THREE.Vector3(widthScale, heightScale, widthScale)
    const matrix = new THREE.Matrix4().compose(position, quaternion, scale)
    const branchColour = new THREE.Color('#ffffff').lerp(barkTint, 0.08 + tree.tint * 0.08)
    const leafColour = leafBase.clone().lerp(leafAccent, 0.16 + tree.tint * 0.56)
    return { tree, matrix, branchColour, leafColour }
  })
}

function TreeArchetypeBatch({
  species,
  variant,
  trees,
  reducedMotion,
}: {
  species: TreeModelSpecies
  variant: number
  trees: TreePlacement[]
  reducedMotion: boolean
}) {
  const archetype = useMemo(() => generateTreeArchetype(species, variant), [species, variant])
  const prepared = useMemo(
    () => prepareTrees(trees, species, archetype.height),
    [trees, species, archetype.height],
  )

  const nearBranches = useMemo(
    () => buildDetailedBranchGeometry(archetype, { radialScale: 1, ringStride: 1 }),
    [archetype],
  )
  const nearLeaves = useMemo(
    () => buildDetailedLeafGeometry(archetype, { density: 1, sizeScale: 1 }),
    [archetype],
  )
  const midBranches = useMemo(
    () => buildDetailedBranchGeometry(archetype, { radialScale: 0.6, ringStride: 2 }),
    [archetype],
  )
  const midLeaves = useMemo(
    () => buildDetailedLeafGeometry(archetype, { density: 0.5, sizeScale: 1.1 }),
    [archetype],
  )
  const farBranches = useMemo(
    () => buildDetailedBranchGeometry(archetype, { radialScale: 0.32, ringStride: 3, maxLevel: 2 }),
    [archetype],
  )
  const farLeaves = useMemo(
    () => buildDetailedLeafGeometry(archetype, { density: 0.22, sizeScale: 1.28 }),
    [archetype],
  )

  const barkTexture = useMemo(() => makeBarkTexture(species), [species])
  const leafTexture = useMemo(() => makeLeafTexture(species), [species])

  const nearBranchRef = useRef<THREE.InstancedMesh>(null)
  const nearLeafRef = useRef<THREE.InstancedMesh>(null)
  const midBranchRef = useRef<THREE.InstancedMesh>(null)
  const midLeafRef = useRef<THREE.InstancedMesh>(null)
  const farBranchRef = useRef<THREE.InstancedMesh>(null)
  const farLeafRef = useRef<THREE.InstancedMesh>(null)
  const elapsed = useRef(999)

  useEffect(() => () => {
    nearBranches.dispose()
    nearLeaves.dispose()
    midBranches.dispose()
    midLeaves.dispose()
    farBranches.dispose()
    farLeaves.dispose()
    barkTexture.dispose()
    leafTexture.dispose()
  }, [nearBranches, nearLeaves, midBranches, midLeaves, farBranches, farLeaves, barkTexture, leafTexture])

  useFrame(({ camera }, delta) => {
    elapsed.current += delta
    if (elapsed.current < 0.18) return
    elapsed.current = 0

    const near: PreparedTree[] = []
    const mid: PreparedTree[] = []
    const far: PreparedTree[] = []
    prepared.forEach((entry) => {
      const dx = entry.tree.x - camera.position.x
      const dz = entry.tree.z - camera.position.z
      const distance = Math.hypot(dx, dz)
      if (distance < 10) near.push(entry)
      else if (distance < 24) mid.push(entry)
      else far.push(entry)
    })

    const write = (
      branchMesh: THREE.InstancedMesh | null,
      foliageMesh: THREE.InstancedMesh | null,
      entries: PreparedTree[],
    ) => {
      if (!branchMesh || !foliageMesh) return
      branchMesh.count = entries.length
      foliageMesh.count = entries.length
      entries.forEach((entry, index) => {
        branchMesh.setMatrixAt(index, entry.matrix)
        foliageMesh.setMatrixAt(index, entry.matrix)
        branchMesh.setColorAt(index, entry.branchColour)
        foliageMesh.setColorAt(index, entry.leafColour)
      })
      branchMesh.instanceMatrix.needsUpdate = true
      foliageMesh.instanceMatrix.needsUpdate = true
      if (branchMesh.instanceColor) branchMesh.instanceColor.needsUpdate = true
      if (foliageMesh.instanceColor) foliageMesh.instanceColor.needsUpdate = true
    }

    write(nearBranchRef.current, nearLeafRef.current, near)
    write(midBranchRef.current, midLeafRef.current, mid)
    write(farBranchRef.current, farLeafRef.current, far)
  })

  const capacity = Math.max(1, prepared.length)

  return (
    <group>
      <instancedMesh ref={nearBranchRef} args={[nearBranches, undefined, capacity]} castShadow receiveShadow frustumCulled={false}>
        <TreeWindMaterial map={barkTexture} strength={0.06} enabled={!reducedMotion} roughness={0.98} />
      </instancedMesh>
      <instancedMesh ref={nearLeafRef} args={[nearLeaves, undefined, capacity]} castShadow frustumCulled={false}>
        <TreeWindMaterial
          map={leafTexture}
          strength={0.11}
          leaf
          enabled={!reducedMotion}
          roughness={0.92}
          alphaTest={0.32}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      <instancedMesh ref={midBranchRef} args={[midBranches, undefined, capacity]} castShadow receiveShadow frustumCulled={false}>
        <TreeWindMaterial map={barkTexture} strength={0.052} enabled={!reducedMotion} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={midLeafRef} args={[midLeaves, undefined, capacity]} castShadow frustumCulled={false}>
        <TreeWindMaterial
          map={leafTexture}
          strength={0.092}
          leaf
          enabled={!reducedMotion}
          roughness={0.95}
          alphaTest={0.3}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      <instancedMesh ref={farBranchRef} args={[farBranches, undefined, capacity]} receiveShadow frustumCulled={false}>
        <TreeWindMaterial map={barkTexture} strength={0.034} enabled={!reducedMotion} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={farLeafRef} args={[farLeaves, undefined, capacity]} frustumCulled={false}>
        <TreeWindMaterial
          map={leafTexture}
          strength={0.066}
          leaf
          enabled={!reducedMotion}
          roughness={1}
          alphaTest={0.27}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  )
}

type TreeBatch = {
  species: TreeModelSpecies
  variant: number
  trees: TreePlacement[]
}

export function DetailedTrees({
  trees,
  reducedMotion = false,
}: {
  trees: TreePlacement[]
  reducedMotion?: boolean
}) {
  const batches = useMemo<TreeBatch[]>(() => {
    const grouped = new Map<string, TreeBatch>()
    trees.forEach((tree) => {
      const species = detailedModelForTree(tree)
      const variant = variantForTree(tree)
      const key = `${species}:${variant}`
      const current = grouped.get(key)
      if (current) current.trees.push(tree)
      else grouped.set(key, { species, variant, trees: [tree] })
    })
    return [...grouped.values()]
  }, [trees])

  return (
    <group>
      {batches.map((batch) => (
        <TreeArchetypeBatch
          key={`${batch.species}:${batch.variant}`}
          species={batch.species}
          variant={batch.variant}
          trees={batch.trees}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  )
}
