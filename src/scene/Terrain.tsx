import { useMemo } from 'react'
import * as THREE from 'three'
import { terrainHeight } from '../lib/forest'

export function Terrain({ seed, size = 40 }: { seed: string; size?: number }) {
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(size, size, 88, 88)
    terrain.rotateX(-Math.PI / 2)
    const positions = terrain.attributes.position

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const z = positions.getZ(index)
      positions.setY(index, terrainHeight(x, z, seed) - 0.3)
    }

    positions.needsUpdate = true
    terrain.computeVertexNormals()
    return terrain
  }, [seed, size])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#17261a" roughness={0.98} metalness={0} />
    </mesh>
  )
}
