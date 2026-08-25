import { useMemo } from 'react'
import * as THREE from 'three'
import { generateRiver } from '../lib/forest'

export function River({ seed, size = 40 }: { seed: string; size?: number }) {
  const geometry = useMemo(() => {
    const river = generateRiver(seed, size)
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    river.forEach((point, index) => {
      const previous = river[Math.max(0, index - 1)]
      const next = river[Math.min(river.length - 1, index + 1)]
      const tangentX = next.x - previous.x
      const tangentZ = next.z - previous.z
      const length = Math.hypot(tangentX, tangentZ) || 1
      const normalX = -tangentZ / length
      const normalZ = tangentX / length
      const halfWidth = point.width * 0.72
      const y = point.waterY + 0.012

      positions.push(
        point.x + normalX * halfWidth,
        y,
        point.z + normalZ * halfWidth,
        point.x - normalX * halfWidth,
        y,
        point.z - normalZ * halfWidth,
      )
      const v = index / Math.max(1, river.length - 1)
      uvs.push(0, v, 1, v)

      if (index < river.length - 1) {
        const base = index * 2
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
      }
    })

    const buffer = new THREE.BufferGeometry()
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    buffer.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    buffer.setIndex(indices)
    buffer.computeVertexNormals()
    return buffer
  }, [seed, size])

  return (
    <mesh geometry={geometry} receiveShadow renderOrder={2}>
      <meshPhysicalMaterial
        color="#335e55"
        roughness={0.24}
        metalness={0}
        clearcoat={0.65}
        clearcoatRoughness={0.18}
        transmission={0.08}
        transparent
        opacity={0.84}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
