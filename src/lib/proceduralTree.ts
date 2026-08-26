import * as THREE from 'three'
import { mulberry32, seedToUint32 } from './noise'

export const TREE_MODEL_SPECIES = [
  'white-oak',
  'red-maple',
  'tulip-poplar',
  'sweetgum',
  'american-beech',
  'ponderosa-pine',
  'loblolly-pine',
  'douglas-fir',
  'cultivated-apple',
  'sweet-cherry',
  'paper-birch',
  'quaking-aspen',
  'american-sycamore',
  'flowering-dogwood',
  'weeping-willow',
  'joshua-tree',
] as const

export type TreeModelSpecies = (typeof TREE_MODEL_SPECIES)[number]
export type LeafShape = 'oval' | 'lobed' | 'heart' | 'round' | 'willow' | 'needle' | 'tuft'
export type CrownShape = 'round' | 'columnar' | 'conical' | 'broad' | 'vase' | 'weeping'

export type TreePreset = {
  name: string
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
  crownShape: CrownShape
  attractionUp: number
  crownWidth: number
  leavesPerTip: number
  leafSize: number
  leafAspect: number
  leafShape: LeafShape
  rootCount: number
  rootSpread: number
  bark: string
  barkAccent: string
  leaf: string
  leafAccent: string
  conifer?: boolean
  droop?: number
  tipCluster?: boolean
  gnarl?: number
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
  species: TreeModelSpecies
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
const X_AXIS = new THREE.Vector3(1, 0, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

const BASE_BROADLEAF: TreePreset = {
  name: 'Broadleaf',
  levels: 4,
  branches: [0, 10, 3, 2],
  length: [1, 0.44, 0.48, 0.4],
  lengthVariation: [0.03, 0.1, 0.13, 0.15],
  downAngle: [0, 54, 43, 36],
  downVariation: [0, 11, 14, 17],
  rotate: [0, GOLDEN_ANGLE, 132, 144],
  curve: [4, 17, 22, 25],
  curveVariation: [4, 15, 19, 23],
  curveResolution: [9, 6, 4, 3],
  radialSegments: [10, 7, 5, 4],
  trunkRadius: 0.048,
  flare: 0.65,
  crownShape: 'round',
  attractionUp: 0.2,
  crownWidth: 1,
  leavesPerTip: 6,
  leafSize: 0.115,
  leafAspect: 1.9,
  leafShape: 'oval',
  rootCount: 5,
  rootSpread: 0.29,
  bark: '#574331',
  barkAccent: '#241c16',
  leaf: '#355b2d',
  leafAccent: '#89a65b',
  gnarl: 2.6,
}

const BASE_CONIFER: TreePreset = {
  ...BASE_BROADLEAF,
  name: 'Conifer',
  branches: [0, 15, 2, 1],
  length: [1, 0.36, 0.46, 0.34],
  lengthVariation: [0.02, 0.06, 0.09, 0.1],
  downAngle: [0, 74, 58, 47],
  downVariation: [0, 7, 9, 10],
  curve: [2, 7, 10, 11],
  curveVariation: [2, 7, 9, 10],
  curveResolution: [10, 5, 4, 3],
  radialSegments: [9, 6, 4, 3],
  trunkRadius: 0.041,
  flare: 0.34,
  crownShape: 'conical',
  attractionUp: 0.08,
  crownWidth: 0.76,
  leavesPerTip: 8,
  leafSize: 0.14,
  leafAspect: 4.2,
  leafShape: 'needle',
  rootCount: 4,
  rootSpread: 0.24,
  bark: '#4b382a',
  barkAccent: '#211913',
  leaf: '#244630',
  leafAccent: '#627e51',
  conifer: true,
  gnarl: 1.6,
}

const BASE_ORCHARD: TreePreset = {
  ...BASE_BROADLEAF,
  name: 'Orchard',
  branches: [0, 8, 4, 2],
  length: [1, 0.5, 0.45, 0.34],
  downAngle: [0, 62, 48, 38],
  curve: [7, 22, 28, 30],
  curveVariation: [7, 20, 24, 26],
  trunkRadius: 0.06,
  flare: 0.78,
  crownShape: 'broad',
  crownWidth: 1.18,
  leavesPerTip: 7,
  rootCount: 6,
  rootSpread: 0.33,
  gnarl: 5,
}

const BASE_SLENDER: TreePreset = {
  ...BASE_BROADLEAF,
  name: 'Slender',
  branches: [0, 9, 3, 2],
  length: [1, 0.47, 0.46, 0.38],
  downAngle: [0, 45, 34, 28],
  curve: [3, 13, 17, 20],
  curveVariation: [3, 11, 14, 17],
  curveResolution: [10, 6, 4, 3],
  radialSegments: [9, 6, 5, 4],
  trunkRadius: 0.037,
  flare: 0.45,
  crownShape: 'columnar',
  attractionUp: 0.34,
  crownWidth: 0.78,
  leavesPerTip: 7,
  leafSize: 0.102,
  leafAspect: 2.1,
  rootCount: 4,
  rootSpread: 0.23,
  bark: '#8d8678',
  barkAccent: '#565047',
  leaf: '#6f8d58',
  leafAccent: '#c1ce99',
  gnarl: 1.8,
}

const BASE_WEEPING: TreePreset = {
  ...BASE_BROADLEAF,
  name: 'Weeping',
  branches: [0, 11, 4, 2],
  length: [1, 0.52, 0.58, 0.54],
  downAngle: [0, 50, 64, 78],
  downVariation: [0, 12, 14, 12],
  curve: [4, 16, 35, 46],
  curveVariation: [4, 15, 24, 28],
  crownShape: 'weeping',
  crownWidth: 1.18,
  attractionUp: 0.08,
  leafShape: 'willow',
  leafSize: 0.12,
  leafAspect: 4.1,
  leavesPerTip: 8,
  droop: 0.85,
  rootCount: 7,
  rootSpread: 0.36,
  bark: '#554638',
  barkAccent: '#2a211b',
  leaf: '#55743c',
  leafAccent: '#9eae69',
  gnarl: 3.4,
}

function preset(base: TreePreset, overrides: Partial<TreePreset>): TreePreset {
  return {
    ...base,
    ...overrides,
    branches: [...(overrides.branches ?? base.branches)],
    length: [...(overrides.length ?? base.length)],
    lengthVariation: [...(overrides.lengthVariation ?? base.lengthVariation)],
    downAngle: [...(overrides.downAngle ?? base.downAngle)],
    downVariation: [...(overrides.downVariation ?? base.downVariation)],
    rotate: [...(overrides.rotate ?? base.rotate)],
    curve: [...(overrides.curve ?? base.curve)],
    curveVariation: [...(overrides.curveVariation ?? base.curveVariation)],
    curveResolution: [...(overrides.curveResolution ?? base.curveResolution)],
    radialSegments: [...(overrides.radialSegments ?? base.radialSegments)],
  }
}

const PRESETS: Record<TreeModelSpecies, TreePreset> = {
  'white-oak': preset(BASE_BROADLEAF, {
    name: 'White Oak', crownShape: 'broad', trunkRadius: 0.062, flare: 0.95,
    branches: [0, 12, 4, 2], length: [1, 0.52, 0.5, 0.39], downAngle: [0, 59, 46, 37],
    crownWidth: 1.2, rootCount: 7, rootSpread: 0.39, bark: '#55412f', barkAccent: '#231a14',
    leaf: '#34552b', leafAccent: '#879f58', leafShape: 'lobed', gnarl: 5.5,
  }),
  'red-maple': preset(BASE_BROADLEAF, {
    name: 'Red Maple', branches: [0, 11, 4, 2], crownShape: 'round', trunkRadius: 0.048,
    downAngle: [0, 50, 39, 32], leafShape: 'lobed', leaf: '#3c6131', leafAccent: '#9ca95a',
    bark: '#5c4939', barkAccent: '#2e241d', crownWidth: 1.05, gnarl: 3.2,
  }),
  'tulip-poplar': preset(BASE_SLENDER, {
    name: 'Tulip Poplar', branches: [0, 10, 3, 2], crownShape: 'columnar', trunkRadius: 0.043,
    attractionUp: 0.39, crownWidth: 0.72, leafShape: 'lobed', bark: '#69705c', barkAccent: '#384034',
    leaf: '#4e7138', leafAccent: '#a4b86d', rootSpread: 0.27, gnarl: 1.4,
  }),
  sweetgum: preset(BASE_BROADLEAF, {
    name: 'Sweetgum', crownShape: 'conical', branches: [0, 11, 3, 2], downAngle: [0, 57, 43, 34],
    trunkRadius: 0.046, leafShape: 'lobed', leaf: '#3f6632', leafAccent: '#92a85b',
    bark: '#584231', barkAccent: '#241a14', crownWidth: 0.93, gnarl: 2.5,
  }),
  'american-beech': preset(BASE_BROADLEAF, {
    name: 'American Beech', crownShape: 'broad', branches: [0, 12, 4, 2], length: [1, 0.5, 0.48, 0.38],
    trunkRadius: 0.057, flare: 0.82, crownWidth: 1.16, leafShape: 'oval', bark: '#929084',
    barkAccent: '#5f5c54', leaf: '#456a39', leafAccent: '#9cb36e', rootCount: 7, rootSpread: 0.4, gnarl: 2.1,
  }),
  'ponderosa-pine': preset(BASE_CONIFER, {
    name: 'Ponderosa Pine', branches: [0, 15, 2, 1], length: [1, 0.39, 0.45, 0.32],
    downAngle: [0, 77, 61, 50], trunkRadius: 0.047, crownWidth: 0.8,
    bark: '#744b31', barkAccent: '#322016', leaf: '#2e5135', leafAccent: '#6c8655', leafAspect: 4.6,
  }),
  'loblolly-pine': preset(BASE_CONIFER, {
    name: 'Loblolly Pine', branches: [0, 14, 2, 1], length: [1, 0.34, 0.43, 0.34],
    downAngle: [0, 71, 55, 45], crownShape: 'columnar', crownWidth: 0.7, trunkRadius: 0.042,
    leaf: '#31563b', leafAccent: '#718b59', leafAspect: 5.2,
  }),
  'douglas-fir': preset(BASE_CONIFER, {
    name: 'Douglas Fir', branches: [0, 17, 2, 1], length: [1, 0.35, 0.42, 0.3],
    downAngle: [0, 79, 62, 49], crownWidth: 0.74, trunkRadius: 0.044, curve: [2, 5, 8, 9],
    bark: '#563b2b', barkAccent: '#251913', leaf: '#244b35', leafAccent: '#66825a', leafAspect: 3.8,
  }),
  'cultivated-apple': preset(BASE_ORCHARD, {
    name: 'Cultivated Apple', branches: [0, 8, 4, 2], length: [1, 0.56, 0.44, 0.31],
    trunkRadius: 0.071, crownWidth: 1.27, leafShape: 'oval', bark: '#5b4937', barkAccent: '#2d241b',
    leaf: '#456b37', leafAccent: '#a0b06a', gnarl: 6.5,
  }),
  'sweet-cherry': preset(BASE_ORCHARD, {
    name: 'Sweet Cherry', branches: [0, 9, 3, 2], length: [1, 0.52, 0.45, 0.34],
    trunkRadius: 0.057, crownShape: 'round', crownWidth: 1.12, bark: '#6b4235', barkAccent: '#2f1d18',
    leaf: '#3d6634', leafAccent: '#99b16b', gnarl: 4,
  }),
  'paper-birch': preset(BASE_SLENDER, {
    name: 'Paper Birch', trunkRadius: 0.034, flare: 0.32, crownWidth: 0.72, branches: [0, 9, 3, 2],
    bark: '#d9d5c9', barkAccent: '#514d47', leaf: '#70904f', leafAccent: '#c5d08c', leafShape: 'heart',
    rootCount: 4, rootSpread: 0.22, gnarl: 1.2,
  }),
  'quaking-aspen': preset(BASE_SLENDER, {
    name: 'Quaking Aspen', trunkRadius: 0.032, crownWidth: 0.68, branches: [0, 8, 3, 2],
    downAngle: [0, 41, 31, 26], bark: '#c6c2ae', barkAccent: '#666156', leaf: '#779550',
    leafAccent: '#c4cf85', leafShape: 'round', leafSize: 0.1, leafAspect: 1.35, gnarl: 1,
  }),
  'american-sycamore': preset(BASE_BROADLEAF, {
    name: 'American Sycamore', crownShape: 'broad', branches: [0, 13, 4, 2], length: [1, 0.54, 0.52, 0.4],
    trunkRadius: 0.069, flare: 1.05, crownWidth: 1.28, rootCount: 8, rootSpread: 0.43,
    bark: '#aaa18c', barkAccent: '#655c4d', leaf: '#3c6230', leafAccent: '#96ab62', leafShape: 'lobed', gnarl: 5,
  }),
  'flowering-dogwood': preset(BASE_BROADLEAF, {
    name: 'Flowering Dogwood', branches: [0, 8, 3, 2], length: [1, 0.6, 0.46, 0.34],
    downAngle: [0, 67, 53, 42], trunkRadius: 0.05, crownShape: 'vase', crownWidth: 1.22,
    bark: '#4b4035', barkAccent: '#241f1a', leaf: '#486b3a', leafAccent: '#a0ad68', rootSpread: 0.31, gnarl: 4.5,
  }),
  'weeping-willow': preset(BASE_WEEPING, { name: 'Weeping Willow' }),
  'joshua-tree': preset(BASE_BROADLEAF, {
    name: 'Joshua Tree', levels: 4, branches: [0, 3, 2, 2], length: [1, 0.52, 0.56, 0.48],
    lengthVariation: [0.03, 0.08, 0.1, 0.12], downAngle: [0, 35, 39, 42], downVariation: [0, 8, 9, 10],
    rotate: [0, 120, 145, 137], curve: [2, 10, 14, 16], curveVariation: [2, 8, 11, 13],
    curveResolution: [8, 5, 4, 3], radialSegments: [10, 7, 6, 5], trunkRadius: 0.056, flare: 0.42,
    crownShape: 'vase', attractionUp: 0.28, crownWidth: 0.94, leavesPerTip: 12, leafSize: 0.15,
    leafAspect: 5.6, leafShape: 'tuft', rootCount: 5, rootSpread: 0.3, bark: '#6b5338', barkAccent: '#332718',
    leaf: '#596737', leafAccent: '#9ba65d', tipCluster: true, gnarl: 3.8,
  }),
}

export function getTreePreset(species: TreeModelSpecies): TreePreset {
  return PRESETS[species]
}

function crownShape(shape: CrownShape, t: number): number {
  const x = Math.min(1, Math.max(0, t))
  if (shape === 'conical') return 0.3 + 0.9 * (1 - x)
  if (shape === 'columnar') return 0.7 + Math.sin(x * Math.PI) * 0.3
  if (shape === 'broad') return 0.55 + Math.sin(Math.min(1, x * 1.05) * Math.PI) * 0.68
  if (shape === 'vase') return 0.35 + x * 0.85
  if (shape === 'weeping') return 0.46 + Math.sin(x * Math.PI) * 0.66
  return 0.46 + Math.sin(x * Math.PI) * 0.56
}

function vary(random: () => number, amount: number): number {
  return (random() * 2 - 1) * amount
}

function qAround(axis: THREE.Vector3, degrees: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(degrees))
}

export function generateTreeArchetype(species: TreeModelSpecies, variant = 0): TreeArchetype {
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
    const resolution = Math.max(2, preset.curveResolution[level] ?? 3)
    const points = [origin.clone()]
    const radii = [radius]
    const winds = [windBase]
    const orient = orientation.clone()
    const position = origin.clone()

    for (let ring = 1; ring <= resolution; ring += 1) {
      const section = ring / resolution
      const bend = ((preset.curve[level] ?? 0) + vary(random, preset.curveVariation[level] ?? 0)) / resolution
      orient.multiply(qAround(X_AXIS, bend))
      orient.multiply(qAround(UP, vary(random, (preset.curveVariation[level] ?? 0) * 0.12)))

      const forward = UP.clone().applyQuaternion(orient).normalize()
      if (level > 0 && preset.attractionUp > 0) {
        forward.lerp(UP, preset.attractionUp * section * 0.065).normalize()
      }
      if ((preset.droop ?? 0) > 0 && level >= 2) {
        forward.y -= (preset.droop ?? 0) * section * 0.075
        forward.normalize()
      }

      position.addScaledVector(forward, length / resolution)
      const taper = Math.pow(section, level === preset.levels - 1 ? 1.08 : 1.45)
      const nextRadius = Math.max(0.002, radius * (1 - taper * (level === 0 ? 0.84 : 0.94)))
      points.push(position.clone())
      radii.push(nextRadius)
      winds.push(Math.min(1, windBase + section * (0.24 + level * 0.15)))
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
      radialSegments: preset.radialSegments[level] ?? 4,
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
    let childCount = Math.max(1, (preset.branches[childLevel] ?? 1) + Math.round(vary(random, 1)))
    if (preset.tipCluster && random() < 0.17 + level * 0.12) childCount = 1
    let azimuth = random() * 360

    for (let child = 0; child < childCount; child += 1) {
      const tBase = preset.tipCluster ? 0.88 : level === 0 ? 0.22 : 0.18
      const tSpan = preset.tipCluster ? 0.1 : 0.75
      const t = Math.min(0.985, tBase + ((child + 0.45) / childCount) * tSpan)
      const segment = t * resolution
      const a = Math.min(resolution - 1, Math.floor(segment))
      const localT = segment - a
      const childOrigin = points[a].clone().lerp(points[a + 1], localT)
      const parentDirection = points[a + 1].clone().sub(points[a]).normalize()
      const parentRadius = THREE.MathUtils.lerp(radii[a], radii[a + 1], localT)
      const shape = level === 0 ? crownShape(preset.crownShape, t) : 1
      const childLength = Math.max(
        0.04,
        length * ((preset.length[childLevel] ?? 0.4) + vary(random, preset.lengthVariation[childLevel] ?? 0.08)) * shape,
      )
      const childRadius = Math.min(
        parentRadius * (preset.tipCluster ? 0.9 : 0.78),
        radius * Math.pow(Math.max(0.08, childLength / length), 1.18),
      )

      if (preset.tipCluster && childCount > 1) {
        azimuth = (360 / childCount) * child + random() * 18
      } else {
        azimuth += (preset.rotate[childLevel] ?? GOLDEN_ANGLE) + vary(random, 10)
      }

      const around = qAround(UP, azimuth)
      const downward = qAround(
        X_AXIS,
        (preset.downAngle[childLevel] ?? 45) + vary(random, preset.downVariation[childLevel] ?? 8),
      )
      const parentQuat = new THREE.Quaternion().setFromUnitVectors(UP, parentDirection)
      const childOrientation = parentQuat.multiply(around).multiply(downward)
      const inheritedWind = THREE.MathUtils.lerp(winds[a], winds[a + 1], localT)
      buildStem(childLevel, childOrigin, childOrientation, childLength, childRadius, inheritedWind, id)
    }

    return id
  }

  const gnarl = preset.gnarl ?? 2.5
  const trunkLean = new THREE.Quaternion()
    .multiply(qAround(Z_AXIS, vary(random, gnarl)))
    .multiply(qAround(X_AXIS, vary(random, gnarl * 0.7)))

  buildStem(0, new THREE.Vector3(0, 0, 0), trunkLean, 1, preset.trunkRadius, 0.025)

  const rootRandom = mulberry32(seedToUint32(`${species}:${variant}:roots`))
  const trunkRadius = stems[0]?.radii[0] ?? preset.trunkRadius
  for (let root = 0; root < preset.rootCount; root += 1) {
    const angle = (root / preset.rootCount) * Math.PI * 2 + vary(rootRandom, 0.24)
    const length = preset.rootSpread * (0.62 + rootRandom() * 0.55)
    const start = new THREE.Vector3(Math.cos(angle) * trunkRadius * 0.16, 0.01, Math.sin(angle) * trunkRadius * 0.16)
    const mid = new THREE.Vector3(Math.cos(angle) * length * 0.56, -0.012, Math.sin(angle) * length * 0.56)
    const end = new THREE.Vector3(Math.cos(angle) * length, -0.035 - rootRandom() * 0.025, Math.sin(angle) * length)
    stems.push({
      id: stems.length,
      parentId: 0,
      level: 0,
      maxLevel: preset.levels - 1,
      points: [start, mid, end],
      radii: [trunkRadius * (0.42 + rootRandom() * 0.16), trunkRadius * 0.23, 0.005],
      winds: [0, 0, 0],
      radialSegments: Math.max(5, (preset.radialSegments[0] ?? 8) - 3),
      root: true,
    })
  }

  let maxY = 0
  let minY = 0
  let maxRadius = 0
  stems.forEach((stem) => stem.points.forEach((point) => {
    maxY = Math.max(maxY, point.y)
    minY = Math.min(minY, point.y)
    maxRadius = Math.max(maxRadius, Math.hypot(point.x, point.z))
  }))

  return {
    species,
    variant,
    preset,
    stems,
    tips,
    height: Math.max(0.001, maxY - minY),
    crownCentreY: maxY * 0.64,
    crownWidth: Math.max(0.15, maxRadius * 2 * preset.crownWidth),
    crownHeight: Math.max(0.2, maxY * 0.7),
  }
}

function tangentAt(points: THREE.Vector3[], index: number, target: THREE.Vector3): THREE.Vector3 {
  if (index === 0) target.copy(points[1]).sub(points[0])
  else if (index === points.length - 1) target.copy(points[index]).sub(points[index - 1])
  else target.copy(points[index + 1]).sub(points[index - 1])
  if (target.lengthSq() < 1e-10) target.copy(UP)
  return target.normalize()
}

export function buildDetailedBranchGeometry(
  tree: TreeArchetype,
  options: BranchGeometryOptions = {},
): THREE.BufferGeometry {
  const radialScale = options.radialScale ?? 1
  const ringStride = Math.max(1, Math.round(options.ringStride ?? 1))
  const maxLevel = options.maxLevel ?? Number.POSITIVE_INFINITY
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const winds: number[] = []
  const indices: number[] = []
  let vertexBase = 0

  const tangent = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const binormal = new THREE.Vector3()
  const radial = new THREE.Vector3()

  tree.stems.forEach((stem) => {
    if (!stem.root && stem.level > maxLevel) return
    const selected: number[] = []
    for (let index = 0; index < stem.points.length - 1; index += ringStride) selected.push(index)
    if (selected[selected.length - 1] !== stem.points.length - 1) selected.push(stem.points.length - 1)
    if (selected.length < 2) return

    const sides = Math.max(3, Math.round(stem.radialSegments * radialScale))
    const ringVerts = sides + 1
    let vAlong = 0
    const frameNormals: THREE.Vector3[] = []
    const frameBins: THREE.Vector3[] = []

    selected.forEach((sourceIndex, selectedIndex) => {
      tangentAt(stem.points, sourceIndex, tangent)
      if (selectedIndex === 0) {
        normal.crossVectors(tangent, UP)
        if (normal.lengthSq() < 1e-6) normal.crossVectors(tangent, X_AXIS)
        normal.normalize()
      } else {
        normal.copy(frameNormals[selectedIndex - 1])
        normal.addScaledVector(tangent, -normal.dot(tangent))
        if (normal.lengthSq() < 1e-8) normal.crossVectors(tangent, X_AXIS)
        normal.normalize()
      }
      binormal.crossVectors(normal, tangent).normalize()
      frameNormals.push(normal.clone())
      frameBins.push(binormal.clone())

      if (selectedIndex > 0) {
        vAlong += stem.points[sourceIndex].distanceTo(stem.points[selected[selectedIndex - 1]])
      }
      const radius = stem.radii[sourceIndex]
      const wind = stem.winds[sourceIndex] ?? 0
      for (let side = 0; side <= sides; side += 1) {
        const angle = (side / sides) * Math.PI * 2
        radial.copy(frameNormals[selectedIndex]).multiplyScalar(Math.cos(angle))
          .addScaledVector(frameBins[selectedIndex], Math.sin(angle))
        const point = stem.points[sourceIndex].clone().addScaledVector(radial, radius)
        positions.push(point.x, point.y, point.z)
        normals.push(radial.x, radial.y, radial.z)
        uvs.push(side / sides, vAlong / 0.18)
        winds.push(wind)
      }
    })

    for (let ring = 0; ring < selected.length - 1; ring += 1) {
      for (let side = 0; side < sides; side += 1) {
        const a = vertexBase + ring * ringVerts + side
        const b = a + 1
        const c = a + ringVerts
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }
    vertexBase += selected.length * ringVerts
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
  tree: TreeArchetype,
  options: LeafGeometryOptions = {},
): THREE.BufferGeometry {
  const density = Math.min(1, Math.max(0.05, options.density ?? 1))
  const sizeScale = options.sizeScale ?? 1
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const winds: number[] = []
  const colours: number[] = []
  const indices: number[] = []
  const random = mulberry32(seedToUint32(`${tree.species}:${tree.variant}:leaf-cards:${density}:${sizeScale}`))
  const leafBase = new THREE.Color(tree.preset.leaf)
  const leafAccent = new THREE.Color(tree.preset.leafAccent)
  let vertex = 0

  tree.tips.forEach((tip, tipIndex) => {
    const total = Math.max(1, Math.round(tree.preset.leavesPerTip * density))
    const direction = tip.direction.clone().normalize()
    const side = new THREE.Vector3().crossVectors(direction, UP)
    if (side.lengthSq() < 1e-5) side.crossVectors(direction, X_AXIS)
    side.normalize()
    const upCard = new THREE.Vector3().crossVectors(side, direction).normalize()

    for (let leaf = 0; leaf < total; leaf += 1) {
      const angle = (leaf / total) * Math.PI * 2 + random() * 0.7 + tipIndex * 0.19
      const q = new THREE.Quaternion().setFromAxisAngle(direction, angle)
      const right = side.clone().applyQuaternion(q).normalize()
      const up = upCard.clone().applyQuaternion(q).normalize()
      const along = direction.clone().multiplyScalar((random() - 0.2) * tree.preset.leafSize * 0.55)
      const centre = tip.position.clone().add(along)
      if (tree.preset.leafShape === 'tuft') centre.addScaledVector(direction, tree.preset.leafSize * 0.2)

      const scaleJitter = 0.78 + random() * 0.44
      const height = tree.preset.leafSize * sizeScale * scaleJitter
      const width = height / tree.preset.leafAspect
      const halfW = width * 0.5
      const halfH = height * 0.5
      const corners = [
        centre.clone().addScaledVector(right, -halfW).addScaledVector(up, -halfH),
        centre.clone().addScaledVector(right, halfW).addScaledVector(up, -halfH),
        centre.clone().addScaledVector(right, halfW).addScaledVector(up, halfH),
        centre.clone().addScaledVector(right, -halfW).addScaledVector(up, halfH),
      ]
      const faceNormal = new THREE.Vector3().crossVectors(right, up).normalize()
      const colour = leafBase.clone().lerp(leafAccent, 0.18 + random() * 0.62)
      corners.forEach((corner) => {
        positions.push(corner.x, corner.y, corner.z)
        normals.push(faceNormal.x, faceNormal.y, faceNormal.z)
        winds.push(tip.wind)
        colours.push(colour.r, colour.g, colour.b)
      })
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
      indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3)
      vertex += 4
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aWind', new THREE.Float32BufferAttribute(winds, 1))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

export function treeGeometryStats(geometry: THREE.BufferGeometry): { vertices: number; triangles: number } {
  const vertices = geometry.getAttribute('position')?.count ?? 0
  const triangles = geometry.index ? geometry.index.count / 3 : vertices / 3
  return { vertices, triangles }
}
