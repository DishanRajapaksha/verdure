import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateRiver } from '../lib/forest'
import { mulberry32, seedToUint32 } from '../lib/noise'
import { riverAgitation, riverFlowSpeedAtIndex } from '../lib/environment'

type RiverStone = {
  x: number
  y: number
  z: number
  scale: number
  rotation: number
  tangentX: number
  tangentZ: number
  normalX: number
  normalZ: number
  waterY: number
  flow: number
}

type FoamStreak = {
  stone: number
  phase: number
  side: number
  speed: number
  width: number
  length: number
}

type Constriction = {
  x: number
  y: number
  z: number
  tangentX: number
  tangentZ: number
  phase: number
  radius: number
  flow: number
}

type Eddy = {
  stone: number
  phase: number
  side: number
  radius: number
}

const stoneDark = new THREE.Color('#26322f')
const stoneLight = new THREE.Color('#53645a')

export function RiverLife({
  seed,
  size = 40,
  reducedMotion = false,
}: {
  seed: string
  size?: number
  reducedMotion?: boolean
}) {
  const stoneRef = useRef<THREE.InstancedMesh>(null)
  const foamRef = useRef<THREE.InstancedMesh>(null)
  const rippleRef = useRef<THREE.InstancedMesh>(null)
  const eddyRef = useRef<THREE.InstancedMesh>(null)

  const stoneGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.5, 1), [])
  const foamGeometry = useMemo(() => {
    const geometry = new THREE.CircleGeometry(0.5, 18)
    geometry.rotateX(-Math.PI / 2)
    return geometry
  }, [])
  const rippleGeometry = useMemo(() => {
    const geometry = new THREE.RingGeometry(0.43, 0.5, 28)
    geometry.rotateX(-Math.PI / 2)
    return geometry
  }, [])
  const eddyGeometry = useMemo(() => {
    const geometry = new THREE.RingGeometry(0.35, 0.43, 28, 1, 0, Math.PI * 1.45)
    geometry.rotateX(-Math.PI / 2)
    return geometry
  }, [])

  const river = useMemo(() => generateRiver(seed, size), [seed, size])

  const stones = useMemo<RiverStone[]>(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0x5db3c6e1)
    const result: RiverStone[] = []

    for (let index = 5; index < river.length - 5; index += 4) {
      if (random() > 0.62) continue
      const point = river[index]
      const previous = river[index - 1]
      const next = river[index + 1]
      const tangentXRaw = next.x - previous.x
      const tangentZRaw = next.z - previous.z
      const tangentLength = Math.hypot(tangentXRaw, tangentZRaw) || 1
      const tangentX = tangentXRaw / tangentLength
      const tangentZ = tangentZRaw / tangentLength
      const normalX = -tangentZ
      const normalZ = tangentX
      const lateral = (random() - 0.5) * point.width * 0.9
      const scale = 0.18 + random() * 0.24

      result.push({
        x: point.x + normalX * lateral,
        y: point.waterY - scale * (0.18 + random() * 0.14),
        z: point.z + normalZ * lateral,
        scale,
        rotation: random() * Math.PI * 2,
        tangentX,
        tangentZ,
        normalX,
        normalZ,
        waterY: point.waterY,
        flow: riverFlowSpeedAtIndex(river, index),
      })
    }

    return result.slice(0, 18)
  }, [river, seed])

  const foam = useMemo<FoamStreak[]>(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0x91e10da5)
    return stones.flatMap((stone, stoneIndex) => {
      const agitation = riverAgitation(stone.flow)
      const baseSpeed = 0.12 + stone.flow * 0.2
      return [
        {
          stone: stoneIndex,
          phase: random(),
          side: -1,
          speed: baseSpeed * (0.88 + random() * 0.3),
          width: 0.1 + random() * 0.07 + agitation * 0.045,
          length: 0.34 + random() * 0.22 + agitation * 0.22,
        },
        {
          stone: stoneIndex,
          phase: random(),
          side: 1,
          speed: baseSpeed * (0.8 + random() * 0.36),
          width: 0.09 + random() * 0.07 + agitation * 0.035,
          length: 0.28 + random() * 0.28 + agitation * 0.18,
        },
      ]
    })
  }, [seed, stones])

  const constrictions = useMemo<Constriction[]>(() => {
    const candidates = river
      .map((point, index) => {
        if (index < 4 || index >= river.length - 4) return null
        const neighbourWidth = (river[index - 2].width + river[index + 2].width) * 0.5
        return { point, index, score: neighbourWidth - point.width }
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate && candidate.score > 0.006))
      .sort((a, b) => b.score - a.score)

    const selected: typeof candidates = []
    for (const candidate of candidates) {
      if (selected.some((existing) => Math.abs(existing.index - candidate.index) < 7)) continue
      selected.push(candidate)
      if (selected.length >= 8) break
    }

    return selected.flatMap(({ point, index }, selectedIndex) => {
      const previous = river[index - 1]
      const next = river[index + 1]
      const tangentXRaw = next.x - previous.x
      const tangentZRaw = next.z - previous.z
      const tangentLength = Math.hypot(tangentXRaw, tangentZRaw) || 1
      const tangentX = tangentXRaw / tangentLength
      const tangentZ = tangentZRaw / tangentLength
      const flow = riverFlowSpeedAtIndex(river, index)
      return [0, 1].map((ring) => ({
        x: point.x,
        y: point.waterY + 0.026,
        z: point.z,
        tangentX,
        tangentZ,
        phase: selectedIndex * 0.173 + ring * 0.48,
        radius: point.width * (0.62 + ring * 0.18),
        flow,
      }))
    })
  }, [river])

  const eddies = useMemo<Eddy[]>(() => {
    return stones
      .map((stone, index) => ({
        stone: index,
        phase: index * 0.371,
        side: index % 2 === 0 ? -1 : 1,
        radius: stone.scale * (0.72 + riverAgitation(stone.flow) * 0.52),
      }))
      .filter((_, index) => index % 2 === 0)
  }, [stones])

  useLayoutEffect(() => {
    const mesh = stoneRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    stones.forEach((stone, index) => {
      position.set(stone.x, stone.y, stone.z)
      euler.set(stone.rotation * 0.17, stone.rotation, stone.rotation * 0.11)
      quaternion.setFromEuler(euler)
      scale.set(stone.scale * 1.18, stone.scale * 0.72, stone.scale)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
      colour.copy(stoneDark).lerp(stoneLight, (index % 5) * 0.1 + 0.15)
      mesh.setColorAt(index, colour)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [stones])

  useFrame((state) => {
    const time = reducedMotion ? 0 : state.clock.elapsedTime
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()

    const foamMesh = foamRef.current
    if (foamMesh) {
      foam.forEach((streak, index) => {
        const stone = stones[streak.stone]
        const cycle = (streak.phase + time * streak.speed) % 1
        const travel = -0.18 + cycle * (0.58 + stone.flow * 0.18)
        const wake = Math.sin(cycle * Math.PI)
        position.set(
          stone.x + stone.tangentX * travel + stone.normalX * streak.side * stone.scale * 0.48,
          stone.waterY + 0.028,
          stone.z + stone.tangentZ * travel + stone.normalZ * streak.side * stone.scale * 0.48,
        )
        euler.set(0, Math.atan2(stone.tangentX, stone.tangentZ), 0)
        quaternion.setFromEuler(euler)
        scale.set(streak.width * (0.65 + wake * 0.55), 1, streak.length * (0.75 + wake * 0.5))
        matrix.compose(position, quaternion, scale)
        foamMesh.setMatrixAt(index, matrix)
      })
      foamMesh.instanceMatrix.needsUpdate = true
    }

    const rippleMesh = rippleRef.current
    if (rippleMesh) {
      constrictions.forEach((ripple, index) => {
        const cycle = (ripple.phase + time * (0.12 + ripple.flow * 0.2)) % 1
        const downstream = cycle * (0.28 + ripple.flow * 0.24)
        position.set(
          ripple.x + ripple.tangentX * downstream,
          ripple.y,
          ripple.z + ripple.tangentZ * downstream,
        )
        quaternion.identity()
        const expansion = ripple.radius * (0.72 + cycle * (0.72 + riverAgitation(ripple.flow) * 0.42))
        scale.set(expansion * 1.55, 1, expansion * 0.72)
        matrix.compose(position, quaternion, scale)
        rippleMesh.setMatrixAt(index, matrix)
      })
      rippleMesh.instanceMatrix.needsUpdate = true
    }

    const eddyMesh = eddyRef.current
    if (eddyMesh) {
      eddies.forEach((eddy, index) => {
        const stone = stones[eddy.stone]
        const agitation = riverAgitation(stone.flow)
        const downstream = stone.scale * (0.72 + agitation * 0.46)
        const side = stone.scale * eddy.side * 0.5
        position.set(
          stone.x + stone.tangentX * downstream + stone.normalX * side,
          stone.waterY + 0.03,
          stone.z + stone.tangentZ * downstream + stone.normalZ * side,
        )
        euler.set(0, time * (0.35 + stone.flow * 0.72) * eddy.side + eddy.phase, 0)
        quaternion.setFromEuler(euler)
        const pulse = 0.82 + Math.sin(time * (0.9 + stone.flow) + eddy.phase) * 0.16
        scale.set(eddy.radius * pulse * 1.5, 1, eddy.radius * pulse)
        matrix.compose(position, quaternion, scale)
        eddyMesh.setMatrixAt(index, matrix)
      })
      eddyMesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {stones.length > 0 && (
        <instancedMesh ref={stoneRef} args={[stoneGeometry, undefined, stones.length]} castShadow receiveShadow>
          <meshStandardMaterial roughness={0.88} metalness={0} />
        </instancedMesh>
      )}
      {foam.length > 0 && (
        <instancedMesh ref={foamRef} args={[foamGeometry, undefined, foam.length]} frustumCulled={false} renderOrder={4}>
          <meshBasicMaterial color="#dce7d7" transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
        </instancedMesh>
      )}
      {constrictions.length > 0 && (
        <instancedMesh ref={rippleRef} args={[rippleGeometry, undefined, constrictions.length]} frustumCulled={false} renderOrder={3}>
          <meshBasicMaterial color="#b9cec5" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
        </instancedMesh>
      )}
      {eddies.length > 0 && (
        <instancedMesh ref={eddyRef} args={[eddyGeometry, undefined, eddies.length]} frustumCulled={false} renderOrder={4}>
          <meshBasicMaterial color="#c6d8d1" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  )
}
