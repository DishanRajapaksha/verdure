import { fbm2D, mulberry32, ridge2D, seedToUint32 } from './noise'

export type TreeSpecies = 'broadleaf' | 'conifer' | 'silverleaf' | 'ancient'
export type UnderstoryKind = 'fern' | 'shrub' | 'grass' | 'mushroom' | 'moss' | 'sapling'

export type TreePlacement = {
  x: number
  y: number
  z: number
  height: number
  girth: number
  rotation: number
  canopy: number
  tint: number
  species: TreeSpecies
  lean: number
  branchiness: number
}

export type RockPlacement = {
  x: number
  y: number
  z: number
  scale: number
  rotation: number
  tint: number
}

export type UnderstoryPlacement = {
  x: number
  y: number
  z: number
  scale: number
  rotation: number
  tint: number
  kind: UnderstoryKind
  wetness: number
}

export type RiverPoint = {
  x: number
  z: number
  terrainY: number
  waterY: number
  width: number
  depth: number
}

export type RiverSample = {
  distance: number
  width: number
  bankWidth: number
  depth: number
  waterY: number
  progress: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const riverCache = new Map<string, RiverPoint[]>()

export function naturalTerrainHeight(x: number, z: number, seed: string | number): number {
  const s = seedToUint32(seed)
  const broad = fbm2D(x * 0.035, z * 0.035, s ^ 0xa17c9e21, 5)
  const detail = fbm2D(x * 0.11, z * 0.11, s ^ 0x61e39ac7, 4)
  const ridge = ridge2D(x * 0.045, z * 0.045, s ^ 0x4b1d3e55)
  return (broad - 0.5) * 2.6 + (detail - 0.5) * 0.65 + (ridge - 0.55) * 0.45
}

export function generateRiver(seed: string | number, size = 40): RiverPoint[] {
  const s = seedToUint32(seed)
  const cacheKey = `${s}:${size}`
  const cached = riverCache.get(cacheKey)
  if (cached) return cached

  const random = mulberry32(s ^ 0x6e624eb7)
  const half = size / 2
  const flowAngle = random() * Math.PI * 2
  const flowX = Math.cos(flowAngle)
  const flowZ = Math.sin(flowAngle)
  const sideX = -flowZ
  const sideZ = flowX
  const lateralOffset = (random() - 0.5) * size * 0.34
  let x = -flowX * half * 0.93 + sideX * lateralOffset
  let z = -flowZ * half * 0.93 + sideZ * lateralOffset
  let dirX = flowX
  let dirZ = flowZ
  let previousWaterY = naturalTerrainHeight(x, z, s) - 0.1
  const step = 0.68
  const maxSteps = Math.ceil(size / step * 2.25)
  const points: RiverPoint[] = []
  const candidateTurns = [-0.82, -0.5, -0.25, 0, 0.25, 0.5, 0.82]

  for (let index = 0; index < maxSteps; index += 1) {
    const terrainY = naturalTerrainHeight(x, z, s)
    const progress = index / Math.max(1, maxSteps - 1)
    const waterY = index === 0
      ? terrainY - 0.1
      : Math.min(terrainY - 0.085, previousWaterY - 0.006)
    const widthNoise = fbm2D(x * 0.09, z * 0.09, s ^ 0xa32f0741, 3)
    const width = 0.44 + progress * 0.28 + widthNoise * 0.12
    const depth = 0.2 + progress * 0.16 + widthNoise * 0.055

    points.push({ x, z, terrainY, waterY, width, depth })
    previousWaterY = waterY

    if (index > 12 && (Math.abs(x) > half * 1.04 || Math.abs(z) > half * 1.04)) break

    const heading = Math.atan2(dirZ, dirX)
    let bestScore = Number.POSITIVE_INFINITY
    let bestX = x + dirX * step
    let bestZ = z + dirZ * step
    let bestDirX = dirX
    let bestDirZ = dirZ

    candidateTurns.forEach((turn) => {
      const angle = heading + turn
      const candidateDirX = Math.cos(angle)
      const candidateDirZ = Math.sin(angle)
      const nx = x + candidateDirX * step
      const nz = z + candidateDirZ * step
      const height = naturalTerrainHeight(nx, nz, s)
      const globalProgress = nx * flowX + nz * flowZ
      const meander = fbm2D(nx * 0.075 + 9.3, nz * 0.075 - 4.8, s ^ 0x93bf1c2d, 3) - 0.5
      const backwards = Math.max(0, -(candidateDirX * flowX + candidateDirZ * flowZ))
      const score = height * 1.7 - globalProgress * 0.042 + Math.abs(turn) * 0.055 + backwards * 0.5 + meander * 0.11

      if (score < bestScore) {
        bestScore = score
        bestX = nx
        bestZ = nz
        bestDirX = candidateDirX
        bestDirZ = candidateDirZ
      }
    })

    x = bestX
    z = bestZ
    const blendedX = bestDirX * 0.79 + flowX * 0.21
    const blendedZ = bestDirZ * 0.79 + flowZ * 0.21
    const length = Math.hypot(blendedX, blendedZ) || 1
    dirX = blendedX / length
    dirZ = blendedZ / length
  }

  riverCache.set(cacheKey, points)
  return points
}

export function riverSampleAt(
  x: number,
  z: number,
  seed: string | number,
  size = 40,
): RiverSample {
  const points = generateRiver(seed, size)
  let bestDistanceSq = Number.POSITIVE_INFINITY
  let best: RiverSample = {
    distance: Number.POSITIVE_INFINITY,
    width: 0.5,
    bankWidth: 1,
    depth: 0.25,
    waterY: 0,
    progress: 0,
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]
    const b = points[index + 1]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const lengthSq = dx * dx + dz * dz || 1
    const t = clamp01(((x - a.x) * dx + (z - a.z) * dz) / lengthSq)
    const px = a.x + dx * t
    const pz = a.z + dz * t
    const ox = x - px
    const oz = z - pz
    const distanceSq = ox * ox + oz * oz

    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq
      const width = a.width + (b.width - a.width) * t
      best = {
        distance: Math.sqrt(distanceSq),
        width,
        bankWidth: width * 2.05,
        depth: a.depth + (b.depth - a.depth) * t,
        waterY: a.waterY + (b.waterY - a.waterY) * t,
        progress: (index + t) / Math.max(1, points.length - 1),
      }
    }
  }

  return best
}

export function terrainHeight(
  x: number,
  z: number,
  seed: string | number,
  size = 40,
): number {
  const base = naturalTerrainHeight(x, z, seed)
  const river = riverSampleAt(x, z, seed, size)
  if (river.distance >= river.bankWidth) return base

  if (river.distance <= river.width) {
    const channelT = clamp01(river.distance / river.width)
    const centreBed = river.waterY - river.depth
    const channelTarget = centreBed + river.depth * Math.pow(channelT, 1.55)
    return Math.min(base, channelTarget)
  }

  const bankT = clamp01((river.bankWidth - river.distance) / (river.bankWidth - river.width))
  return base - river.depth * 0.2 * bankT * bankT
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

export function vegetationWetness(x: number, z: number, seed: string | number): number {
  const s = seedToUint32(seed)
  const basin = fbm2D(x * 0.031 - 12.5, z * 0.031 + 8.25, s ^ 0x4ae7c2f1, 5)
  const seep = ridge2D(x * 0.073 + 2.7, z * 0.073 - 5.6, s ^ 0x8db173a9)
  const lowGround = clamp01(0.58 - naturalTerrainHeight(x, z, s) * 0.12)
  return clamp01(basin * 0.58 + seep * 0.22 + lowGround * 0.2)
}

function chooseTreeSpecies(
  density: number,
  wetness: number,
  roll: number,
): TreeSpecies {
  if (roll < 0.055 && density > 0.5) return 'ancient'
  if (wetness > 0.61 && roll < 0.31) return 'silverleaf'
  if (density > 0.58 && roll > 0.69) return 'conifer'
  return 'broadleaf'
}

export function generateForest(seed: string | number, size = 40): TreePlacement[] {
  const s = seedToUint32(seed)
  const random = mulberry32(s ^ 0x9e3779b9)
  const spacing = 1.12
  const half = size / 2
  const trees: TreePlacement[] = []

  for (let z = -half; z <= half; z += spacing) {
    for (let x = -half; x <= half; x += spacing) {
      const px = x + (random() - 0.5) * spacing * 0.9
      const pz = z + (random() - 0.5) * spacing * 0.9
      const density = forestDensity(px, pz, s)
      const river = riverSampleAt(px, pz, s, size)

      if (river.distance < river.bankWidth * 0.92) continue
      if (random() > density * 0.84) continue

      const wetness = clamp01(vegetationWetness(px, pz, s) + Math.max(0, 1 - river.distance / (river.bankWidth * 2.4)) * 0.28)
      const species = chooseTreeSpecies(density, wetness, random())
      const age = Math.pow(random(), 0.66)

      let height = 1.45 + age * 2.8 + density * 0.72
      let girth = 0.72 + random() * 0.62
      let canopy = 0.78 + random() * 0.46 + density * 0.2

      if (species === 'conifer') {
        height *= 1.12
        girth *= 0.82
        canopy *= 0.78
      } else if (species === 'silverleaf') {
        height *= 1.06
        girth *= 0.76
        canopy *= 0.88
      } else if (species === 'ancient') {
        height *= 0.94
        girth *= 1.48
        canopy *= 1.22
      }

      trees.push({
        x: px,
        y: terrainHeight(px, pz, s, size),
        z: pz,
        height,
        girth,
        rotation: random() * Math.PI * 2,
        canopy,
        tint: clamp01(density * 0.56 + wetness * 0.18 + random() * 0.3),
        species,
        lean: (random() - 0.5) * (species === 'ancient' ? 0.18 : 0.11),
        branchiness: 0.72 + random() * 0.58,
      })
    }
  }

  return trees
}

function chooseUnderstoryKind(
  density: number,
  wetness: number,
  roll: number,
): UnderstoryKind {
  if (density > 0.52 && wetness > 0.55 && roll < 0.29) return 'fern'
  if (density > 0.62 && wetness > 0.58 && roll < 0.39) return 'mushroom'
  if (wetness > 0.58 && roll < 0.58) return 'moss'
  if (density < 0.46 && roll < 0.58) return 'grass'
  if (density > 0.44 && roll < 0.78) return 'shrub'
  return 'sapling'
}

export function generateUnderstory(
  seed: string | number,
  size = 40,
): UnderstoryPlacement[] {
  const s = seedToUint32(seed)
  const random = mulberry32(s ^ 0x2dc73a41)
  const spacing = 0.68
  const half = size / 2
  const plants: UnderstoryPlacement[] = []

  for (let z = -half; z <= half; z += spacing) {
    for (let x = -half; x <= half; x += spacing) {
      const px = x + (random() - 0.5) * spacing * 0.92
      const pz = z + (random() - 0.5) * spacing * 0.92
      const density = forestDensity(px, pz, s)
      const river = riverSampleAt(px, pz, s, size)
      if (river.distance < river.width * 0.8) continue

      const bankMoisture = Math.max(0, 1 - river.distance / (river.bankWidth * 2.2))
      const wetness = clamp01(vegetationWetness(px, pz, s) + bankMoisture * 0.42)
      const habitat = clamp01(0.2 + density * 0.42 + wetness * 0.3)

      if (random() > habitat * 0.68) continue

      const kind = chooseUnderstoryKind(density, wetness, random())
      const baseScale = 0.58 + Math.pow(random(), 0.7) * 0.72
      const kindScale =
        kind === 'mushroom' ? 0.52 : kind === 'moss' ? 0.82 : kind === 'sapling' ? 1.16 : 1

      plants.push({
        x: px,
        y: terrainHeight(px, pz, s, size) + (kind === 'moss' ? 0.015 : 0.025),
        z: pz,
        scale: baseScale * kindScale,
        rotation: random() * Math.PI * 2,
        tint: clamp01(density * 0.46 + wetness * 0.34 + random() * 0.28),
        kind,
        wetness,
      })
    }
  }

  return plants
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
      y: terrainHeight(x, z, s, size) - 0.05,
      z,
      scale: 0.18 + Math.pow(random(), 2) * 0.72,
      rotation: random() * Math.PI * 2,
      tint: random(),
    })
  }

  return rocks
}
