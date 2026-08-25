import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32, seedToUint32 } from '../lib/noise'
import { generateRiver, terrainHeight } from '../lib/forest'
import { gustAt, mistPoolWeight } from '../lib/environment'
import { LeafDrift } from './LeafDrift'

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

export function Atmosphere({
  seed,
  size = 40,
  reducedMotion = false,
}: {
  seed: string
  size?: number
  reducedMotion?: boolean
}) {
  const mistRef = useRef<THREE.Group>(null)
  const motesRef = useRef<THREE.Points>(null)
  const texture = useMemo(makeMistTexture, [])

  const banks = useMemo(() => {
    const random = mulberry32(seedToUint32(seed) ^ 0x2da9f31b)
    const scattered: Array<{
      x: number
      y: number
      z: number
      scale: readonly [number, number, number]
      opacity: number
      phase: number
      driftX: number
      driftZ: number
      colour: string
      pool: number
    }> = []

    for (let attempt = 0; attempt < 180 && scattered.length < 20; attempt += 1) {
      const x = (random() - 0.5) * size * 0.86
      const z = (random() - 0.5) * size * 0.86
      const pool = mistPoolWeight(x, z, seed, size)
      if (random() > 0.12 + pool * 0.94) continue
      const index = scattered.length
      scattered.push({
        x,
        y: terrainHeight(x, z, seed, size) + 0.34 + random() * (0.38 + (1 - pool) * 0.35),
        z,
        scale: [3.4 + random() * 5.8 + pool * 2.4, 0.95 + random() * 1.45 + pool * 0.7, 1] as const,
        opacity: 0.035 + pool * 0.105 + random() * 0.025,
        phase: random() * Math.PI * 2,
        driftX: 0.18 + random() * 0.58,
        driftZ: 0.16 + random() * 0.48,
        colour: index % 3 === 0 ? '#aaa1ba' : '#bcc6ba',
        pool,
      })
    }

    const river = generateRiver(seed, size)
    const riverBanks = river
      .filter((_, index) => index > 3 && index < river.length - 4 && index % 7 === 0)
      .slice(0, 9)
      .map((point, index) => {
        const pool = mistPoolWeight(point.x, point.z, seed, size)
        return {
          x: point.x,
          y: point.waterY + 0.24 + (index % 3) * 0.06,
          z: point.z,
          scale: [4.4 + point.width * 3.2 + pool * 1.8, 0.88 + point.width * 0.48 + pool * 0.55, 1] as const,
          opacity: 0.04 + pool * 0.075,
          phase: index * 0.91 + 0.7,
          driftX: 0.14 + point.width * 0.3,
          driftZ: 0.18 + point.width * 0.28,
          colour: index % 2 === 0 ? '#b7bcc4' : '#aaa1ba',
          pool,
        }
      })

    return [...scattered, ...riverBanks]
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

  useFrame((state) => {
    const motion = reducedMotion ? 0 : 1
    const time = state.clock.elapsedTime

    if (mistRef.current) {
      mistRef.current.children.forEach((child, index) => {
        const bank = banks[index]
        if (!bank) return
        const gust = reducedMotion ? 0 : gustAt(bank.x, bank.z, time, seed)
        const drift = (0.32 + gust * 0.68) * motion
        child.position.x = bank.x + Math.sin(time * 0.055 + bank.phase) * bank.driftX * drift
        child.position.z = bank.z + Math.cos(time * 0.043 + bank.phase * 1.31) * bank.driftZ * drift
        child.position.y = bank.y + Math.sin(time * 0.1 + bank.phase) * 0.1 * motion
        const sprite = child as THREE.Sprite
        const material = sprite.material as THREE.SpriteMaterial
        const breathing = 0.9 + Math.sin(time * 0.075 + bank.phase) * 0.1 * motion
        const windThinning = 1 - gust * 0.5
        material.opacity = bank.opacity * breathing * windThinning * (0.82 + bank.pool * 0.18)
      })
    }

    const points = motesRef.current
    if (points) {
      const attribute = points.geometry.getAttribute('position') as THREE.BufferAttribute
      const positions = attribute.array as Float32Array
      for (let index = 0; index < 320; index += 1) {
        const baseX = motes[index * 3]
        const baseY = motes[index * 3 + 1]
        const baseZ = motes[index * 3 + 2]
        const phase = index * 0.6180339
        const gust = reducedMotion ? 0 : gustAt(baseX, baseZ, time, seed)
        positions[index * 3] = baseX + Math.sin(time * 0.14 + phase) * (0.08 + gust * 0.28) * motion
        positions[index * 3 + 1] = baseY + Math.sin(time * 0.22 + phase * 1.7) * 0.12 * motion
        positions[index * 3 + 2] = baseZ + Math.cos(time * 0.11 + phase) * (0.07 + gust * 0.2) * motion
      }
      attribute.needsUpdate = true
    }
  })

  return (
    <group>
      <group ref={mistRef}>
        {banks.map((bank, index) => (
          <sprite key={index} position={[bank.x, bank.y, bank.z]} scale={bank.scale}>
            <spriteMaterial
              map={texture}
              color={bank.colour}
              transparent
              opacity={bank.opacity}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        ))}
      </group>
      <points ref={motesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[motes.slice(), 3]} />
        </bufferGeometry>
        <pointsMaterial color="#d8ddc8" size={0.035} transparent opacity={0.3} depthWrite={false} />
      </points>
      <LeafDrift seed={seed} size={size} reducedMotion={reducedMotion} />
    </group>
  )
}
