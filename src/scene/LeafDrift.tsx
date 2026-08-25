import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32, seedToUint32 } from '../lib/noise'
import { terrainHeight } from '../lib/forest'
import { gustAt } from '../lib/environment'

type LeafParticle = {
  x: number
  z: number
  groundY: number
  startHeight: number
  speed: number
  phase: number
  spin: number
  size: number
  tint: number
}

const leafDark = new THREE.Color('#355028')
const leafLight = new THREE.Color('#8ba45a')
const leafAmber = new THREE.Color('#9b7844')

export function LeafDrift({
  seed,
  size = 40,
  reducedMotion = false,
}: {
  seed: string
  size?: number
  reducedMotion?: boolean
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => {
    const leaf = new THREE.CircleGeometry(0.1, 5)
    leaf.scale(1.35, 0.62, 1)
    return leaf
  }, [])

  const leaves = useMemo<LeafParticle[]>(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0x7f4a9d31)
    const half = size * 0.42
    return Array.from({ length: 84 }, () => {
      const x = (random() - 0.5) * half * 2
      const z = (random() - 0.5) * half * 2
      const groundY = terrainHeight(x, z, seed, size)
      return {
        x,
        z,
        groundY,
        startHeight: groundY + 2.2 + random() * 5.4,
        speed: 0.18 + random() * 0.34,
        phase: random() * Math.PI * 2,
        spin: 0.8 + random() * 2.4,
        size: 0.55 + random() * 0.85,
        tint: random(),
      }
    })
  }, [seed, size])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const colour = new THREE.Color()
    leaves.forEach((leaf, index) => {
      if (leaf.tint > 0.84) {
        colour.copy(leafLight).lerp(leafAmber, (leaf.tint - 0.84) / 0.16)
      } else {
        colour.copy(leafDark).lerp(leafLight, leaf.tint / 0.84)
      }
      mesh.setColorAt(index, colour)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [leaves])

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return

    const time = reducedMotion ? 0 : state.clock.elapsedTime
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()

    leaves.forEach((leaf, index) => {
      const gust = reducedMotion ? 0 : gustAt(leaf.x, leaf.z, time, seed)
      const span = 6.4
      const falling = leaf.startHeight - leaf.groundY - time * leaf.speed * (0.88 + gust * 0.42)
      const wrapped = ((falling % span) + span) % span
      const y = leaf.groundY + 0.18 + wrapped
      const gustSweep = 0.22 + gust * 1.08
      const x = leaf.x + Math.sin(time * (0.3 + gust * 0.28) + leaf.phase) * 0.82 * gustSweep
      const z = leaf.z + Math.cos(time * (0.25 + gust * 0.22) + leaf.phase * 1.7) * 0.58 * gustSweep

      position.set(x, y, z)
      euler.set(
        time * leaf.spin * (0.72 + gust * 0.9) + leaf.phase,
        leaf.phase + Math.sin(time * 1.2 + leaf.phase) * (0.45 + gust * 0.72),
        Math.sin(time * 1.8 + leaf.phase) * (0.38 + gust * 0.76),
      )
      quaternion.setFromEuler(euler)
      const flutter = leaf.size * (0.9 + Math.sin(time * (2.1 + gust * 2.8) + leaf.phase) * 0.08)
      scale.setScalar(flutter)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, leaves.length]}
      castShadow
      frustumCulled={false}
    >
      <meshStandardMaterial roughness={0.95} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}
