import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateRiver, terrainHeight } from '../lib/forest'
import { mulberry32, seedToUint32 } from '../lib/noise'
import {
  fireflyHabitatScore,
  gustAt,
  riverFlowSpeedAtIndex,
  waterInsectHabitatScore,
} from '../lib/environment'

type Firefly = {
  x: number
  y: number
  z: number
  phase: number
  radius: number
  speed: number
  lift: number
  habitat: number
}

type WaterInsect = {
  x: number
  y: number
  z: number
  tangentX: number
  tangentZ: number
  normalX: number
  normalZ: number
  phase: number
  speed: number
  radius: number
  habitat: number
  flow: number
}

type FallingSeed = {
  x: number
  z: number
  groundY: number
  phase: number
  speed: number
  spin: number
  drift: number
  height: number
}

type Bird = {
  phase: number
  speed: number
  y: number
  z: number
  scale: number
  offset: number
}

export function AmbientLife({
  seed,
  size = 40,
  reducedMotion = false,
}: {
  seed: string
  size?: number
  reducedMotion?: boolean
}) {
  const fireflyRef = useRef<THREE.InstancedMesh>(null)
  const insectRef = useRef<THREE.InstancedMesh>(null)
  const seedRef = useRef<THREE.InstancedMesh>(null)
  const birdRef = useRef<THREE.InstancedMesh>(null)

  const fireflyGeometry = useMemo(() => new THREE.SphereGeometry(0.045, 7, 5), [])
  const insectGeometry = useMemo(() => new THREE.SphereGeometry(0.022, 5, 3), [])
  const seedGeometry = useMemo(() => new THREE.ConeGeometry(0.024, 0.18, 5), [])
  const birdGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 0, 0, -0.42, 0.12, 0, -0.08, -0.08, 0, 0, 0, 0, 0.42, 0.12, 0, 0.08, -0.08, 0],
        3,
      ),
    )
    geometry.computeVertexNormals()
    return geometry
  }, [])

  const fireflies = useMemo<Firefly[]>(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0xa6c5f741)
    const half = size * 0.4
    const result: Firefly[] = []
    for (let attempt = 0; attempt < 360 && result.length < 48; attempt += 1) {
      const x = (random() - 0.5) * half * 2
      const z = (random() - 0.5) * half * 2
      const habitat = fireflyHabitatScore(x, z, seed, size)
      if (random() > 0.08 + habitat * 0.98) continue
      const ground = terrainHeight(x, z, seed, size)
      result.push({
        x,
        y: ground + 0.48 + random() * (1.3 + habitat * 1.3),
        z,
        phase: random() * Math.PI * 2,
        radius: 0.15 + random() * (0.28 + habitat * 0.42),
        speed: 0.13 + random() * 0.3,
        lift: 0.1 + random() * 0.28,
        habitat,
      })
    }
    return result
  }, [seed, size])

  const insects = useMemo<WaterInsect[]>(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0x4d78e3a9)
    const river = generateRiver(seed, size)
    const result: WaterInsect[] = []
    for (let index = 4; index < river.length - 4; index += 3) {
      const habitat = waterInsectHabitatScore(river, index)
      if (random() > 0.12 + habitat * 0.86) continue
      const point = river[index]
      const previous = river[index - 1]
      const next = river[index + 1]
      const dx = next.x - previous.x
      const dz = next.z - previous.z
      const length = Math.hypot(dx, dz) || 1
      const tangentX = dx / length
      const tangentZ = dz / length
      const flow = riverFlowSpeedAtIndex(river, index)
      result.push({
        x: point.x,
        y: point.waterY + 0.14 + random() * 0.26,
        z: point.z,
        tangentX,
        tangentZ,
        normalX: -tangentZ,
        normalZ: tangentX,
        phase: random() * Math.PI * 2,
        speed: 0.9 + habitat * 0.9 + random() * 1.2,
        radius: 0.14 + random() * Math.max(0.16, point.width * 0.58),
        habitat,
        flow,
      })
    }
    return result.slice(0, 28)
  }, [seed, size])

  const seeds = useMemo<FallingSeed[]>(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0x1479bd63)
    const half = size * 0.36
    return Array.from({ length: 34 }, () => {
      const x = (random() - 0.5) * half * 2
      const z = (random() - 0.5) * half * 2
      const groundY = terrainHeight(x, z, seed, size)
      return {
        x,
        z,
        groundY,
        phase: random() * Math.PI * 2,
        speed: 0.08 + random() * 0.14,
        spin: 0.7 + random() * 1.7,
        drift: 0.28 + random() * 0.65,
        height: 3.6 + random() * 4.6,
      }
    })
  }, [seed, size])

  const birds = useMemo<Bird[]>(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0x82fb1e27)
    return Array.from({ length: 3 }, (_, index) => ({
      phase: random() * 0.9 + index * 0.19,
      speed: 0.0065 + random() * 0.0035,
      y: 7.3 + random() * 2.2,
      z: -8 - random() * 8,
      scale: 0.42 + random() * 0.28,
      offset: (random() - 0.5) * 3.2,
    }))
  }, [seed])

  useFrame((state) => {
    const time = reducedMotion ? 0 : state.clock.elapsedTime
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()

    const fireflyMesh = fireflyRef.current
    if (fireflyMesh) {
      fireflies.forEach((firefly, index) => {
        const gust = reducedMotion ? 0 : gustAt(firefly.x, firefly.z, time, seed)
        const calm = 1 - gust * 0.88
        const pulse = 0.42 + Math.pow(0.5 + 0.5 * Math.sin(time * (1.5 + firefly.speed) + firefly.phase), 4) * 1.15
        const orbit = time * firefly.speed * (0.72 + calm * 0.28) + firefly.phase
        position.set(
          firefly.x + Math.sin(orbit * 1.17) * firefly.radius * (0.5 + calm * 0.5),
          firefly.y + Math.sin(orbit * 1.83) * firefly.lift - gust * 0.08,
          firefly.z + Math.cos(orbit * 0.91) * firefly.radius * 0.78 * (0.5 + calm * 0.5),
        )
        quaternion.identity()
        scale.setScalar((0.3 + calm * 0.7) * (0.62 + pulse * 0.72) * (0.72 + firefly.habitat * 0.35))
        matrix.compose(position, quaternion, scale)
        fireflyMesh.setMatrixAt(index, matrix)
      })
      fireflyMesh.instanceMatrix.needsUpdate = true
    }

    const insectMesh = insectRef.current
    if (insectMesh) {
      insects.forEach((insect, index) => {
        const gust = reducedMotion ? 0 : gustAt(insect.x, insect.z, time, seed)
        const calm = 1 - gust
        const dart = time * insect.speed * (0.7 + calm * 0.42) + insect.phase
        const along = Math.sin(dart * 0.73) * insect.radius * 1.4
        const across = Math.sin(dart * 1.77 + Math.sin(dart * 0.31)) * insect.radius * (0.65 + calm * 0.35)
        position.set(
          insect.x + insect.tangentX * along + insect.normalX * across,
          insect.y + Math.sin(dart * 2.4) * 0.05 - gust * 0.08,
          insect.z + insect.tangentZ * along + insect.normalZ * across,
        )
        euler.set(0, Math.atan2(insect.tangentX, insect.tangentZ) + Math.sin(dart) * 0.8, 0)
        quaternion.setFromEuler(euler)
        const wingBeat = 0.72 + Math.abs(Math.sin(dart * 8.5)) * 0.5
        const visibility = 0.2 + calm * 0.8
        scale.set(wingBeat * visibility, 0.72 * visibility, (1.45 + insect.flow * 0.22) * visibility)
        matrix.compose(position, quaternion, scale)
        insectMesh.setMatrixAt(index, matrix)
      })
      insectMesh.instanceMatrix.needsUpdate = true
    }

    const seedMesh = seedRef.current
    if (seedMesh) {
      seeds.forEach((seedParticle, index) => {
        const gust = reducedMotion ? 0 : gustAt(seedParticle.x, seedParticle.z, time, seed)
        const span = seedParticle.height
        const falling = span - time * seedParticle.speed * (0.85 + gust * 0.48) - seedParticle.phase
        const wrapped = ((falling % span) + span) % span
        const spiral = time * (0.18 + gust * 0.42) + seedParticle.phase
        const drift = seedParticle.drift * (0.45 + gust * 1.35)
        position.set(
          seedParticle.x + Math.sin(spiral) * drift,
          seedParticle.groundY + 0.15 + wrapped,
          seedParticle.z + Math.cos(spiral * 0.83) * drift * 0.72,
        )
        euler.set(time * seedParticle.spin * (0.7 + gust) + seedParticle.phase, spiral, Math.sin(spiral * 1.7) * 0.6)
        quaternion.setFromEuler(euler)
        scale.setScalar(0.86 + Math.sin(time * 1.3 + seedParticle.phase) * 0.12)
        matrix.compose(position, quaternion, scale)
        seedMesh.setMatrixAt(index, matrix)
      })
      seedMesh.instanceMatrix.needsUpdate = true
    }

    const birdMesh = birdRef.current
    if (birdMesh) {
      birds.forEach((bird, index) => {
        if (reducedMotion) {
          scale.setScalar(0)
          matrix.compose(position.set(0, 0, 0), quaternion.identity(), scale)
          birdMesh.setMatrixAt(index, matrix)
          return
        }
        const cycle = (time * bird.speed + bird.phase) % 1
        if (cycle >= 0.18) {
          scale.setScalar(0)
          matrix.compose(position.set(0, 0, 0), quaternion.identity(), scale)
          birdMesh.setMatrixAt(index, matrix)
          return
        }
        const t = cycle / 0.18
        position.set(-size * 0.56 + t * size * 1.12, bird.y + Math.sin(t * Math.PI) * 0.35, bird.z + bird.offset + Math.sin(t * 4.2) * 0.7)
        euler.set(0, 0, Math.sin(time * 5.6 + index * 1.7) * 0.08)
        quaternion.setFromEuler(euler)
        const flap = 0.82 + Math.sin(time * 7.2 + index) * 0.12
        scale.set(bird.scale, bird.scale * flap, bird.scale)
        matrix.compose(position, quaternion, scale)
        birdMesh.setMatrixAt(index, matrix)
      })
      birdMesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh ref={fireflyRef} args={[fireflyGeometry, undefined, fireflies.length]} frustumCulled={false} renderOrder={6}>
        <meshBasicMaterial color="#d7e878" transparent opacity={0.72} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
      {insects.length > 0 && (
        <instancedMesh ref={insectRef} args={[insectGeometry, undefined, insects.length]} frustumCulled={false} renderOrder={5}>
          <meshBasicMaterial color="#b9c6a2" transparent opacity={0.58} depthWrite={false} toneMapped={false} />
        </instancedMesh>
      )}
      <instancedMesh ref={seedRef} args={[seedGeometry, undefined, seeds.length]} frustumCulled={false}>
        <meshStandardMaterial color="#b9b28e" roughness={0.9} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={birdRef} args={[birdGeometry, undefined, birds.length]} frustumCulled={false} renderOrder={1}>
        <meshBasicMaterial color="#111b16" side={THREE.DoubleSide} transparent opacity={0.78} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}
