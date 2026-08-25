import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ExperienceMode } from '../App'
import { mulberry32, seedToUint32 } from '../lib/noise'

function makeCabochonGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, 64, 48)
  const positions = geometry.attributes.position

  for (let index = 0; index < positions.count; index += 1) {
    let x = positions.getX(index)
    let y = positions.getY(index)
    let z = positions.getZ(index)
    const vertical = (y + 1) * 0.5
    const taper = 1.12 - vertical * 0.39 + Math.sin(vertical * Math.PI) * 0.11
    const ripple = 1 + Math.sin(x * 8.1 + y * 5.4) * 0.018 + Math.sin(y * 12.7 - z * 8.4) * 0.012

    x *= taper * ripple
    y *= 1.13 * ripple
    z *= (0.69 + (1 - vertical) * 0.08) * ripple

    positions.setXYZ(index, x, y, z)
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

export function Gem({ mode, seed }: { mode: ExperienceMode; seed: string }) {
  const material = useRef<THREE.MeshPhysicalMaterial>(null)
  const geometry = useMemo(makeCabochonGeometry, [])
  const inclusions = useMemo(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0xf4a7c321)
    return Array.from({ length: 13 }, (_, index) => ({
      position: [
        (random() - 0.5) * 4.7,
        (random() - 0.48) * 6.7,
        -0.65 + random() * 0.6,
      ] as const,
      scale: [1 + random() * 2.4, 0.45 + random() * 1.5, 0.12 + random() * 0.35] as const,
      rotation: random() * Math.PI,
      colour: index % 4 === 0 ? '#8c7693' : '#4f6551',
    }))
  }, [seed])

  useFrame((_, delta) => {
    if (!material.current) return
    material.current.opacity = THREE.MathUtils.damp(
      material.current.opacity,
      mode === 'specimen' ? 0.78 : 0.035,
      2.4,
      delta,
    )
  })

  return (
    <group>
      {inclusions.map((inclusion, index) => (
        <mesh
          key={index}
          position={inclusion.position}
          scale={inclusion.scale}
          rotation={[0, 0, inclusion.rotation]}
        >
          <dodecahedronGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={inclusion.colour}
            transparent
            opacity={mode === 'specimen' ? 0.11 : 0.008}
            depthWrite={false}
          />
        </mesh>
      ))}
      <mesh geometry={geometry} scale={[5.7, 6.2, 2.55]} renderOrder={4}>
        <meshPhysicalMaterial
          ref={material}
          color="#8fa88b"
          roughness={0.09}
          metalness={0}
          transmission={0.9}
          thickness={1.7}
          ior={1.46}
          attenuationColor="#526854"
          attenuationDistance={5.5}
          transparent
          opacity={0.78}
          clearcoat={0.55}
          clearcoatRoughness={0.08}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
