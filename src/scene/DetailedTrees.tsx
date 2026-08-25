import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TreePlacement, TreeSpecies } from '../lib/forest'
import { mulberry32, seedToUint32 } from '../lib/noise'
import {
  buildCanopyImpostorGeometry,
  buildDetailedBranchGeometry,
  buildDetailedLeafGeometry,
  generateTreeArchetype,
} from '../lib/proceduralTree'
import { TreeWindMaterial } from './TreeWindMaterial'

const SPECIES: TreeSpecies[] = ['broadleaf', 'silverleaf', 'conifer', 'ancient']
const VARIANT_COUNT = 3

function variantForTree(tree: TreePlacement): number {
  const hash = Math.abs(Math.floor(tree.x * 193.7 + tree.z * 389.1 + tree.tint * 997.3))
  return hash % VARIANT_COUNT
}

function makeBarkTexture(species: TreeSpecies): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const context = canvas.getContext('2d')!
  const random = mulberry32(seedToUint32(`${species}:bark-texture`))
  const palette = {
    broadleaf: ['#5a4533', '#2a2119', '#7a6248'],
    silverleaf: ['#918a7d', '#5d584f', '#b0aa9c'],
    conifer: ['#4b382a', '#211913', '#72543b'],
    ancient: ['#433226', '#17120f', '#664d37'],
  }[species]

  context.fillStyle = palette[0]
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let line = 0; line < 44; line += 1) {
    const x = random() * canvas.width
    const width = 0.5 + random() * 2.8
    const phase = random() * Math.PI * 2
    context.beginPath()
    for (let y = -8; y <= canvas.height + 8; y += 7) {
      const wobble = Math.sin(y * (0.045 + random() * 0.015) + phase) * (1.2 + random() * 2.2)
      if (y === -8) context.moveTo(x + wobble, y)
      else context.lineTo(x + wobble, y)
    }
    context.strokeStyle = line % 4 === 0 ? palette[2] : palette[1]
    context.globalAlpha = line % 4 === 0 ? 0.24 : 0.38 + random() * 0.25
    context.lineWidth = width
    context.stroke()
  }

  context.globalAlpha = 0.14
  for (let fleck = 0; fleck < 240; fleck += 1) {
    context.fillStyle = fleck % 2 === 0 ? palette[1] : palette[2]
    context.fillRect(random() * canvas.width, random() * canvas.height, 0.6 + random() * 2, 0.8 + random() * 5)
  }
  context.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.3, 1)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

function makeLeafTexture(species: TreeSpecies): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, 128, 128)

  if (species === 'conifer') {
    context.strokeStyle = '#ffffff'
    context.lineCap = 'round'
    context.lineWidth = 4
    context.beginPath()
    context.moveTo(64, 116)
    context.lineTo(64, 13)
    context.stroke()
    for (let index = 0; index < 18; index += 1) {
      const y = 105 - index * 5.1
      const width = 15 + (1 - index / 18) * 25
      context.lineWidth = 2.2 + (index % 3) * 0.35
      context.beginPath()
      context.moveTo(64, y)
      context.lineTo(64 - width, y - 9 - (index % 2) * 3)
      context.moveTo(64, y + 1)
      context.lineTo(64 + width, y - 8 + (index % 3) * 2)
      context.stroke()
    }
  } else {
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.moveTo(64, 116)
    context.bezierCurveTo(32, 97, 22, 66, 37, 39)
    context.bezierCurveTo(47, 19, 59, 12, 64, 9)
    context.bezierCurveTo(73, 15, 89, 27, 96, 48)
    context.bezierCurveTo(105, 75, 91, 101, 64, 116)
    context.fill()
    context.strokeStyle = 'rgba(70,82,58,0.42)'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(64, 111)
    context.lineTo(64, 21)
    context.stroke()
    for (let index = 0; index < 5; index += 1) {
      const y = 89 - index * 13
      const spread = 19 - index * 1.7
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(64, y)
      context.lineTo(64 - spread, y - 10)
      context.moveTo(64, y - 2)
      context.lineTo(64 + spread, y - 12)
      context.stroke()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

function makeCanopyTexture(species: TreeSpecies, variant: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')!
  const random = mulberry32(seedToUint32(`${species}:${variant}:canopy-card`))
  context.clearRect(0, 0, 256, 256)

  const count = species === 'conifer' ? 180 : 125
  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * 92
    const x = 128 + Math.cos(angle) * radius * (species === 'silverleaf' ? 0.7 : 1)
    const yBias = species === 'conifer' ? -26 + radius * 0.18 : 0
    const y = 128 + Math.sin(angle) * radius * 0.82 + yBias
    const size = 7 + random() * 19
    context.save()
    context.translate(x, y)
    context.rotate(random() * Math.PI)
    context.fillStyle = `rgba(255,255,255,${0.42 + random() * 0.46})`
    context.beginPath()
    context.ellipse(0, 0, species === 'conifer' ? size * 0.42 : size, species === 'conifer' ? size * 1.6 : size * 0.62, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  const gradient = context.createRadialGradient(128, 126, 42, 128, 126, 126)
  gradient.addColorStop(0, 'rgba(255,255,255,0.12)')
  gradient.addColorStop(0.72, 'rgba(255,255,255,0)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.34)')
  context.globalCompositeOperation = 'destination-out'
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  context.globalCompositeOperation = 'source-over'

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

function prepareTrees(trees: TreePlacement[], species: TreeSpecies): PreparedTree[] {
  const barkTint = new THREE.Color(species === 'silverleaf' ? '#f0eee7' : '#ebe1d4')
  const leafTint = new THREE.Color(species === 'silverleaf' ? '#d8e2be' : species === 'conifer' ? '#b6caaa' : '#d0dfb4')
  return trees.map((tree) => {
    const position = new THREE.Vector3(tree.x, tree.y, tree.z)
    const quaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(tree.lean * 0.2, tree.rotation, tree.lean * 0.72, 'YXZ'),
    )
    const width = 0.82 + (tree.canopy - 0.78) * 0.26 + (tree.girth - 0.72) * 0.05
    const scale = new THREE.Vector3(tree.height * width, tree.height, tree.height * width)
    const matrix = new THREE.Matrix4().compose(position, quaternion, scale)
    const branchColour = new THREE.Color('#ffffff').lerp(barkTint, 0.08 + tree.tint * 0.08)
    const leafColour = new THREE.Color('#ffffff').lerp(leafTint, 0.08 + tree.tint * 0.16)
    return { tree, matrix, branchColour, leafColour }
  })
}

function TreeArchetypeBatch({
  species,
  variant,
  trees,
  reducedMotion,
}: {
  species: TreeSpecies
  variant: number
  trees: TreePlacement[]
  reducedMotion: boolean
}) {
  const archetype = useMemo(() => generateTreeArchetype(species, variant), [species, variant])
  const prepared = useMemo(() => prepareTrees(trees, species), [trees, species])

  const nearBranches = useMemo(
    () => buildDetailedBranchGeometry(archetype, { radialScale: 1, ringStride: 1 }),
    [archetype],
  )
  const nearLeaves = useMemo(
    () => buildDetailedLeafGeometry(archetype, { density: 1, sizeScale: 1 }),
    [archetype],
  )
  const midBranches = useMemo(
    () => buildDetailedBranchGeometry(archetype, { radialScale: 0.62, ringStride: 2 }),
    [archetype],
  )
  const midLeaves = useMemo(
    () => buildDetailedLeafGeometry(archetype, { density: 0.5, sizeScale: 1.12 }),
    [archetype],
  )
  const farBranches = useMemo(
    () => buildDetailedBranchGeometry(archetype, { radialScale: 0.42, ringStride: 3, maxLevel: 1 }),
    [archetype],
  )
  const farCanopy = useMemo(() => buildCanopyImpostorGeometry(archetype), [archetype])

  const barkTexture = useMemo(() => makeBarkTexture(species), [species])
  const leafTexture = useMemo(() => makeLeafTexture(species), [species])
  const canopyTexture = useMemo(() => makeCanopyTexture(species, variant), [species, variant])

  const nearBranchRef = useRef<THREE.InstancedMesh>(null)
  const nearLeafRef = useRef<THREE.InstancedMesh>(null)
  const midBranchRef = useRef<THREE.InstancedMesh>(null)
  const midLeafRef = useRef<THREE.InstancedMesh>(null)
  const farBranchRef = useRef<THREE.InstancedMesh>(null)
  const farCanopyRef = useRef<THREE.InstancedMesh>(null)
  const elapsed = useRef(999)

  useEffect(() => () => {
    nearBranches.dispose()
    nearLeaves.dispose()
    midBranches.dispose()
    midLeaves.dispose()
    farBranches.dispose()
    farCanopy.dispose()
    barkTexture.dispose()
    leafTexture.dispose()
    canopyTexture.dispose()
  }, [nearBranches, nearLeaves, midBranches, midLeaves, farBranches, farCanopy, barkTexture, leafTexture, canopyTexture])

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
      if (distance < 9.5) near.push(entry)
      else if (distance < 22) mid.push(entry)
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
    write(farBranchRef.current, farCanopyRef.current, far)
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
          alphaTest={0.36}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      <instancedMesh ref={midBranchRef} args={[midBranches, undefined, capacity]} castShadow receiveShadow frustumCulled={false}>
        <TreeWindMaterial map={barkTexture} strength={0.054} enabled={!reducedMotion} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={midLeafRef} args={[midLeaves, undefined, capacity]} castShadow frustumCulled={false}>
        <TreeWindMaterial
          map={leafTexture}
          strength={0.095}
          leaf
          enabled={!reducedMotion}
          roughness={0.95}
          alphaTest={0.34}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      <instancedMesh ref={farBranchRef} args={[farBranches, undefined, capacity]} receiveShadow frustumCulled={false}>
        <TreeWindMaterial map={barkTexture} strength={0.035} enabled={!reducedMotion} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={farCanopyRef} args={[farCanopy, undefined, capacity]} frustumCulled={false}>
        <TreeWindMaterial
          map={canopyTexture}
          strength={0.052}
          leaf
          enabled={!reducedMotion}
          roughness={1}
          alphaTest={0.12}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  )
}

export function DetailedTrees({
  trees,
  reducedMotion = false,
}: {
  trees: TreePlacement[]
  reducedMotion?: boolean
}) {
  const batches = useMemo(() => {
    return SPECIES.flatMap((species) =>
      Array.from({ length: VARIANT_COUNT }, (_, variant) => ({
        species,
        variant,
        trees: trees.filter((tree) => tree.species === species && variantForTree(tree) === variant),
      })),
    ).filter((batch) => batch.trees.length > 0)
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
