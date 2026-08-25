import * as THREE from 'three'
import type { TreeSpecies } from './forest'
import { mulberry32, seedToUint32 } from './noise'

export type TreePreset = {
  levels: number
  branches: number[]
  length: number[]
  lengthVariation: number[]
  downAngle: number[]
  downVariation: number[]
  rotate: number[]
  curve: number[]
  curveVariation: number[]
  curveResolution: number[]
  radialSegments: number[]
  trunkRadius: number
  flare: number
  crownShape: 'round' | 'columnar' | 'conical' | 'broad'
  attractionUp: number
  crownWidth: number
  leavesPerTip: number
  leafSize: number
  leafAspect: number
  rootCount: number
  bark: string
  barkAccent: string
  leaf: string
  leafAccent: string
  conifer?: boolean
}

export type DetailedStem = {
  id: number
  parentId: number
  level: number
  maxLevel: number
  points: THREE.Vector3[]
  radii: number[]
  winds: number[]
  radialSegments: number
  root?: boolean
}

export type DetailedTip = {
  position: THREE.Vector3
  direction: THREE.Vector3
  wind: number
  level: number
}

export type TreeArchetype = {
  species: TreeSpecies
  variant: number
  preset: TreePreset
  stems: DetailedStem[]
  tips: DetailedTip[]
  height: number
  crownCentreY: number
  crownWidth: number
  crownHeight: number
}

export type BranchGeometryOptions = {
  radialScale?: number
  ringStride?: number
  maxLevel?: number
}

export type LeafGeometryOptions = {
  density?: number
  sizeScale?: number
}

const GOLDEN_ANGLE = 137.507764
const UP = new THREE.Vector3(0, 1, 0)

const PRESETS: Record<TreeSpecies, TreePreset> = {
  broadleaf: {
    levels: 4,
    branches: [0, 10, 3, 2],
    length: [1, 0.43, 0.48, 0.42],
    lengthVariation: [0.04, 0.1, 0.13, 0.16],
    downAngle: [0, 54, 44, 38],
    downVariation: [0, 12, 15, 18],
    rotate: [0, GOLDEN_ANGLE, 131, 143],
    curve: [4, 17, 22, 25],
    curveVariation: [4, 16, 20, 26],
    curveResolution: [9, 6, 4, 3],
    radialSegments: [10, 7, 5, 4],
    trunkRadius: 0.047,
    flare: 0.72,
    crownShape: 'round',
    attractionUp: 0.2,
    crownWidth: 1,
    leavesPerTip: 6,
    leafSize: 0.115,
    leafAspect: 1.9,
    rootCount: 5,
    bark: '#53402f',
    barkAccent: '#241c16',
    leaf: '#355a2d',
    leafAccent: '#87a55b',
  },
  silverleaf: {
    levels: 4,
    branches: [0, 9, 3, 2],
    length: [1, 0.48, 0.47, 0.39],
    lengthVariation: [0.03, 0.08, 0.12, 0.14],
    downAngle: [0, 46, 34, 29],
    downVariation: [0, 9, 11, 13],
    rotate: [0, 141, 128, 146],
    curve: [3, 13, 17, 20],
    curveVariation: [3, 12, 14, 18],
    curveResolution: [10, 6, 4, 3],
    radialSegments: [9, 6, 5, 4],
    trunkRadius: 0.038,
    flare: 0.48,
    crownShape: 'columnar',
    attractionUp: 0.33,
    crownWidth: 0.82,
    leavesPerTip: 7,
    leafSize: 0.105,
    leafAspect: 2.25,
    rootCount: 4,
    bark: '#8c8577',
    barkAccent: '#524d45',
    leaf: '#718d59',
    leafAccent: '#c3cf9a',
  },
  conifer: {
    levels: 4,
    branches: [0, 15, 2, 1],
    length: [1, 0.36, 0.47, 0.34],
    lengthVariation: [0.02, 0.06, 0.09, 0.11],
    downAngle: [0, 74, 59, 48],
    downVariation: [0, 7, 9, 10],
    rotate: [0, 137, 121, 143],
    curve: [2, 7, 10, 11],
    curveVariation: [2, 8, 10, 12],
    curveResolution: [9, 5, 4, 3],
    radialSegments: [9, 6, 4, 3],
    trunkRadius: 0.041,
    flare: 0.34,
    crownShape: 'conical',
    attractionUp: 0.08,
    crownWidth: 0.78,
    leavesPerTip: 8,
    leafSize: 0.14,
    leafAspect: 3.8,
    rootCount: 4,
    bark: '#4d392a',
    barkAccent: '#211913',
    leaf: '#244630',
    leafAccent: '#5f7c4f',
    conifer: true,
  },
  ancient: {
    levels: 4,
    branches: [0, 12, 4, 2],
    length: [1, 0.52, 0.52, 0.39],
    lengthVariation: [0.05, 0.13, 0.16, 0.17],
    downAngle: [0, 61, 47, 37],
    downVariation: [0, 16, 18, 21],
    rotate: [0, 146, 126, 139],
    curve: [7, 23, 28, 31],
    curveVariation: [8, 22, 27, 31],
    curveResolution: [11, 7, 5, 3],
    radialSegments: [12, 8, 5, 4],
    trunkRadius: 0.066,
    flare: 1.1,
    crownShape: 'broad',
    attractionUp: 0.14,
    crownWidth: 1.2,
    leavesPerTip: 6,
    leafSize: 0.125,
    leafAspect: 1.75,
    rootCount: 7,
    bark: '#453427',
    barkAccent: '#17120f',
    leaf: '#304f29',
    leafAccent: '#829557',
  },
}

export function getTreePreset(species: TreeSpecies): TreePreset {
  return PRESETS[species]
}

function crownShape(shape: TreePreset['crownShape'], t: number): number {
  const x = Math.min(1, Math.max(0, t))
  if (shape === 'conical') return 0.28 + 0.92 * (1 - x)
  if (shape === 'columnar') return 0.72 + Math.sin(x * Math.PI) * 0.28
  if (shape === 'broad') return 0.52 + Math.sin(Math.min(1, x * 1.08) * Math.PI) * 0.62
  return 0.46 + Math.sin(x * Math.PI) * 0.56
}

function vary(random: () => number, amount: number): number {
  return (random() * 2 - 1) * amount
}

function quaternionAround(axis: THREE.Vector3, degrees: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(degrees))
}

export function generateTreeArchetype(species: TreeSpecies, variant = 0): TreeArchetype {
  const preset = getTreePreset(species)
  const random = mulberry32(seedToUint32(`${species}:${variant}:detailed-tree`))
  const stems: DetailedStem[] = []
  const tips: DetailedTip[] = []

  const buildStem = (
    level: number,
    origin: THREE.Vector3,
    orientation: THREE.Quaternion,
    length: number,
    radius: number,
    windBase: number,
    parentId = -1,
  ): number => {
    const resolution = Math.max(2, preset.curveResolution[level])
    const points = [origin.clone()]
    const radii = [radius]
    const winds = [windBase]
    const orient = orientation.clone()
    const position = origin.clone()
    const bendAxis = new THREE.Vector3(1, 0, 0)
    const yawAxis = new THREE.Vector3(0, 1, 0)

    for (let ring = 1; ring <= resolution; ring += 1) {
      const section = ring / resolution
      const bend = (preset.curve[level] + vary(random, preset.curveVariation[level])) / resolution
      orient.multiply(quaternionAround(bendAxis, bend))
      orient.multiply(quaternionAround(yawAxis, vary(random, preset.curveVariation[level] * 0.12)))

      const forward = UP.clone().applyQuaternion(orient).normalize()
      if (level > 0 && preset.attractionUp > 0) {
        forward.lerp(UP, preset.attractionUp * section * 0.065).normalize()
        orient.setFromUnitVectors(UP, forward)
      }

      position.addScaledVector(forward, length / resolution)
      const taper = Math.pow(section, level === preset.levels - 1 ? 1.1 : 1.45)
      const nextRadius = Math.max(0.0022, radius * (1 - taper * (level === 0 ? 0.84 : 0.94)))
      points.push(position.clone())
      radii.push(nextRadius)
      winds.push(Math.min(1, windBase + section * (0.25 + level * 0.14)))
    }

    if (level === 0 && preset.flare > 0) {
      for (let index = 0; index < Math.min(3, radii.length); index += 1) {
        const t = index / Math.max(1, Math.min(2, radii.length - 1))
        radii[index] *= 1 + preset.flare * (1 - t) * 0.72
      }
    }

    const id = stems.length
    stems.push({
      id,
      parentId,
      level,
      maxLevel: preset.levels - 1,
      points,
      radii,
      winds,
      radialSegments: preset.radialSegments[level],
    })

    if (level === preset.levels - 1) {
      const end = points[points.length - 1]
      const before = points[points.length - 2]
      tips.push({
        position: end.clone(),
        direction: end.clone().sub(before).normalize(),
        wind: winds[winds.length - 1],
        level,
      })
      return id
    }

    const childLevel = level + 1
    const childCount = Math.max(0, preset.branches[childLevel] + Math.round(vary(random, 1)))
    let azimuth = random() * 360

    for (let child = 0; child < childCount; child += 1) {
      const tBase = level === 0 ? 0.22 : 0.18
      const t = tBase + (child + 0.45) / Math.max(1, childCount) * (0.97 - tBase)
      const segment = t * resolution
      const a = Math.min(resolution - 1, Math.floor(segment))
      const localT = segment - a
      const childOrigin = points[a].clone().lerp(points[a + 1], localT)
      const parentDirection = points[a + 1].clone().sub(points[a]).normalize()
      const parentRadius = THREE.MathUtils.lerp(radii[a], radii[a + 1], localT)
      const shape = level === 0 ? crownShape(preset.crownShape, t) : 1
      const childLength = Math.max(
        0.035,
        length * (preset.length[childLevel] + vary(random, preset.lengthVariation[childLevel])) * shape,
      )
      const childRadius = Math.min(
        parentRadius * 0.78,
        radius * Math.pow(Math.max(0.08, childLength / length), 1.18),
      )

      azimuth += preset.rotate[childLevel] + vary(random, 10)
      const around = quaternionAround(UP, azimuth)
      const downward = quaternionAround(
        new THREE.Vector3(1, 0, 0),
        preset.downAngle[childLevel] + vary(random, preset.downVariation[childLevel]),
      )
      const parentQuat = new THREE.Quaternion().setFromUnitVectors(UP, parentDirection)
      const childOrientation = parentQuat.multiply(around).multiply(downward)
      const inheritedWind = THREE.MathUtils.lerp(winds[a], winds[a + 1], localT)

      buildStem(childLevel, childOrigin, childOrientation, childLength, childRadius, inheritedWind, id)
    }

    return id
  }

  const trunkLean = new THREE.Quaternion()
    .multiply(quaternionAround(new THREE.Vector3(0, 0, 1), vary(random, species === 'ancient' ? 5.5 : 2.8)))
    .multiply(quaternionAround(new THREE.Vector3(1, 0, 0), vary(random, species === 'ancient' ? 4 : 2)))

  buildStem(0, new THREE.Vector3(0, 0, 0), trunkLean, 1, preset.trunkRadius, 0.025)

  const rootRandom = mulberry32(seedToUint32(`${species}:${variant}:roots`))
  const trunkRadius = stems[0]?.radii[0] ?? preset.trunkRadius
  for (let root = 0; root < preset.rootCount; root += 1) {
    const angle = (root / preset.rootCount) * Math.PI * 2 + vary(rootRandom, 0.24)
    const length = 0.16 + rootRandom() * (species === 'ancient' ? 0.22 : 0.13)
    const start = new THREE.Vector3(Math.cos(angle) * trunkRadius * 0.18, 0.01, Math.sin(angle) * trunkRadius * 0.18)
    const mid = new THREE.Vector3(Math.cos(angle) * length * 0.55, -0.012, Math.sin(angle) * length * 0.55)
    const end = new THREE.Vector3(Math.cos(angle) * length, -0.035 - rootRandom() * 0.025, Math.sin(angle) * length)
    stems.push({
      id: stems.length,
      parentId: 0,
      level: 0,
      maxLevel: preset.levels - 1,
      points: [start, mid, end],
      radii: [trunkRadius * (0.44 + rootRandom() * 0.15), trunkRadius * 0.24, 0.006],
      winds: [0, 0, 0],
      radialSegments: Math.max(5, preset.radialSegments[0] - 3),
      root: true,
    })
  }

  let maxY = 0
  let minY = 0
  stems.forEach((stem) => stem.points.forEach((point) => {
    maxY = Math.max(maxY, point.y)
    minY = Math.min(minY, point.y)
  }))
  const sourceHeight = Math.max(0.1, maxY - minY)
  const scale = 1 / sourceHeight
  stems.forEach((stem) => {
    stem.points.forEach((point) => point.multiplyScalar(scale))
    stem.radii = stem.radii.map((radius) => radius * scale)
  })
  tips.forEach((tip) => tip.position.multiplyScalar(scale))

  const crownYs = tips.map((tip) => tip.position.y)
  const crownCentreY = crownYs.length
    ? crownYs.reduce((sum, y) => sum + y, 0) / crownYs.length
    : 0.72
  let horizontalExtent = 0.3
  let crownMinY = 1
  let crownMaxY = 0
  tips.forEach((tip) => {
    horizontalExtent = Math.max(horizontalExtent, Math.hypot(tip.position.x, tip.position.z))
    crownMinY = Math.min(crownMinY, tip.position.y)
    crownMaxY = Math.max(crownMaxY, tip.position.y)
  })

  return {
    species,
    variant,
    preset,
    stems,
    tips,
    height: 1,
    crownCentreY,
    crownWidth: Math.max(0.45, horizontalExtent * 2.35 * preset.crownWidth),
    crownHeight: Math.max(0.34, (crownMaxY - crownMinY) * 1.4),
  }
}

function tangentAt(points: THREE.Vector3[], index: number): THREE.Vector3 {
  if (index === 0) return points[1].clone().sub(points[0]).normalize()
  if (index === points.length - 1) return points[index].clone().sub(points[index - 1]).normalize()
  return points[index + 1].clone().sub(points[index - 1]).normalize()
}

export function buildDetailedBranchGeometry(
  archetype: TreeArchetype,
  options: BranchGeometryOptions = {},
): THREE.BufferGeometry {
  const radialScale = options.radialScale ?? 1
  const ringStride = Math.max(1, Math.round(options.ringStride ?? 1))
  const maxLevel = options.maxLevel ?? archetype.preset.levels - 1
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const winds: number[] = []
  const indices: number[] = []
  let vertexBase = 0

  archetype.stems.forEach((stem) => {
    if (!stem.root && stem.level > maxLevel) return
    const sourceIndices: number[] = []
    for (let index = 0; index < stem.points.length - 1; index += ringStride) sourceIndices.push(index)
    if (sourceIndices[sourceIndices.length - 1] !== stem.points.length - 1) sourceIndices.push(stem.points.length - 1)

    const points = sourceIndices.map((index) => stem.points[index])
    const radii = sourceIndices.map((index) => stem.radii[index])
    const stemWinds = sourceIndices.map((index) => stem.winds[index])
    const segments = Math.max(3, Math.round(stem.radialSegments * radialScale))
    const ringVertices = segments + 1
    let distanceAlong = 0

    points.forEach((point, ring) => {
      if (ring > 0) distanceAlong += point.distanceTo(points[ring - 1])
      const tangent = tangentAt(points, ring)
      const helper = Math.abs(tangent.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : UP
      const normalAxis = new THREE.Vector3().crossVectors(tangent, helper).normalize()
      const binormal = new THREE.Vector3().crossVectors(normalAxis, tangent).normalize()
      const radius = radii[ring]

      for (let side = 0; side <= segments; side += 1) {
        const angle = side / segments * Math.PI * 2
        const radial = normalAxis.clone().multiplyScalar(Math.cos(angle)).addScaledVector(binormal, Math.sin(angle))
        const vertex = point.clone().addScaledVector(radial, radius)
        positions.push(vertex.x, vertex.y, vertex.z)
        normals.push(radial.x, radial.y, radial.z)
        uvs.push(side / segments, distanceAlong / 0.22)
        winds.push(stem.root ? 0 : stemWinds[ring])
      }
    })

    for (let ring = 0; ring < points.length - 1; ring += 1) {
      for (let side = 0; side < segments; side += 1) {
        const a = vertexBase + ring * ringVertices + side
        const b = a + 1
        const c = a + ringVertices
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    vertexBase += points.length * ringVertices
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aWind', new THREE.Float32BufferAttribute(winds, 1))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

export function buildDetailedLeafGeometry(
  archetype: TreeArchetype,
  options: LeafGeometryOptions = {},
): THREE.BufferGeometry {
  const density = Math.min(1, Math.max(0.05, options.density ?? 1))
  const sizeScale = options.sizeScale ?? 1
  const random = mulberry32(seedToUint32(`${archetype.species}:${archetype.variant}:leaf-geometry:${density}`))
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const colours: number[] = []
  const winds: number[] = []
  const indices: number[] = []
  const baseColour = new THREE.Color(archetype.preset.leaf)
  const accentColour = new THREE.Color(archetype.preset.leafAccent)
  let vertexBase = 0

  archetype.tips.forEach((tip, tipIndex) => {
    const leafCount = Math.max(1, Math.round(archetype.preset.leavesPerTip * density))
    for (let leaf = 0; leaf < leafCount; leaf += 1) {
      if (density < 0.99 && ((tipIndex * 7 + leaf * 13) % 100) / 100 > density + 0.16) continue
      const direction = tip.direction.clone().normalize()
      const angle = random() * Math.PI * 2
      const spread = archetype.preset.leafSize * (0.55 + random() * 1.2)
      const radial = new THREE.Vector3(Math.cos(angle), vary(random, 0.35), Math.sin(angle)).normalize()
      const leafUp = direction.clone().multiplyScalar(0.52).addScaledVector(radial, 0.72).normalize()
      const right = new THREE.Vector3().crossVectors(leafUp, direction)
      if (right.lengthSq() < 0.001) right.set(Math.cos(angle), 0, Math.sin(angle))
      right.normalize()
      const normal = new THREE.Vector3().crossVectors(right, leafUp).normalize()
      const length = archetype.preset.leafSize * sizeScale * (0.75 + random() * 0.55)
      const width = length / archetype.preset.leafAspect
      const centre = tip.position.clone()
        .addScaledVector(direction, 0.015 + random() * 0.045)
        .addScaledVector(radial, spread * random() * 0.55)
      const bottom = centre.clone().addScaledVector(leafUp, -length * 0.14)
      const top = centre.clone().addScaledVector(leafUp, length * 0.86)
      const p0 = bottom.clone().addScaledVector(right, -width * 0.5)
      const p1 = bottom.clone().addScaledVector(right, width * 0.5)
      const p2 = top.clone().addScaledVector(right, -width * 0.38)
      const p3 = top.clone().addScaledVector(right, width * 0.38)
      const tint = baseColour.clone().lerp(accentColour, random() * 0.62)
      tint.multiplyScalar(0.86 + random() * 0.18)

      ;[p0, p1, p2, p3].forEach((point) => {
        positions.push(point.x, point.y, point.z)
        normals.push(normal.x, normal.y, normal.z)
        colours.push(tint.r, tint.g, tint.b)
        winds.push(Math.min(1, tip.wind + 0.12))
      })
      uvs.push(0, 0, 1, 0, 0, 1, 1, 1)
      indices.push(vertexBase, vertexBase + 2, vertexBase + 1, vertexBase + 1, vertexBase + 2, vertexBase + 3)
      vertexBase += 4
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  geometry.setAttribute('aWind', new THREE.Float32BufferAttribute(winds, 1))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

export function buildCanopyImpostorGeometry(archetype: TreeArchetype): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const winds: number[] = []
  const indices: number[] = []
  const width = archetype.crownWidth
  const height = Math.max(archetype.crownHeight, 0.42)
  const centreY = Math.max(0.48, archetype.crownCentreY)
  let base = 0

  for (let plane = 0; plane < 3; plane += 1) {
    const angle = plane / 3 * Math.PI
    const right = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(width * 0.5)
    const bottom = centreY - height * 0.5
    const top = centreY + height * 0.5
    const points = [
      right.clone().multiplyScalar(-1).setY(bottom),
      right.clone().setY(bottom),
      right.clone().multiplyScalar(-1).setY(top),
      right.clone().setY(top),
    ]
    const normal = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle))
    points.forEach((point) => {
      positions.push(point.x, point.y, point.z)
      normals.push(normal.x, normal.y, normal.z)
      winds.push(0.78)
    })
    uvs.push(0, 0, 1, 0, 0, 1, 1, 1)
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
    base += 4
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aWind', new THREE.Float32BufferAttribute(winds, 1))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

export function treeGeometryStats(geometry: THREE.BufferGeometry): { vertices: number; triangles: number } {
  const vertices = geometry.getAttribute('position')?.count ?? 0
  const triangles = geometry.index ? geometry.index.count / 3 : vertices / 3
  return { vertices, triangles }
}
