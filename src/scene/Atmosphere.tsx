import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32, seedToUint32 } from '../lib/noise'
import { terrainHeight } from '../lib/forest'

function makeMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62)
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.34, 'rgba(255,255,255,0.48)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function Atmosphere({ seed, size = 40 }: { seed: string; size?: number }) {
  const mistRef = useRef<THREE.Group>(null)
  const texture = useMemo(makeMistTexture, [])
  const banks = useMemo(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0x2da9f31b)
    return Array.from({ length: 18 }, () => {
      const x = (random() - 0.5) * size * 0.82
      const z = (random() - 0.5) * size * 0.82
      return {
        position: [x, terrainHeight(x, z, seed) + 0.55 + random() * 0.7, z] as const,
        scale: [3.2 + random() * 5.5, 1.2 + random() * 2.3, 1] as const,
        opacity: 0.05 + random() * 0.09,
      }
    })
  }, [seed, size])

  const motes = useMemo(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0x8bd3e2a7)
    const positions = new Float32Array(320 * 3)
    for (let index = 0; index < 320; index += 1) {
      positions[index * 3] = (random() - 0.5) * size * 0.7
      positions[index * 3 + 1] = 0.7 + random() * 6
      positions[index * 3 + 2] = (random() - 0.5) * size * 0.7
    }
    return positions
  }, [seed, size])

  useEffect(() => () => texture.dispose(), [texture])

  useFrame((state, delta) => {
    if (!mistRef.current) return
    mistRef.current.rotation.y += delta * 0.0025
    mistRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.12
  })

  return (
    <group>
      <group ref={mistRef}>
        {banks.map((bank, index) => (
          <sprite key={index} position={bank.position} scale={bank.scale}>
            <spriteMaterial
              map={texture}
              color={index % 3 === 0 ? '#aaa1ba' : '#bcc6ba'}
              transparent
              opacity={bank.opacity}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        ))}
      </group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[motes, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#d8ddc8" size={0.035} transparent opacity={0.3} depthWrite={false} />
      </points>
    </group>
  )
}
