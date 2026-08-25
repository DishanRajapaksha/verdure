import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateRiver } from '../lib/forest'

type Shader = Parameters<THREE.MeshPhysicalMaterial['onBeforeCompile']>[0]

function makeFlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')!
  context.fillStyle = '#6c6c6c'
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let line = 0; line < 96; line += 1) {
    const y = (line / 96) * canvas.height
    const phase = line * 0.73
    context.beginPath()
    for (let x = 0; x <= canvas.width; x += 4) {
      const wave = Math.sin(x * 0.11 + phase) * 3.2 + Math.sin(x * 0.037 - phase * 0.4) * 2.1
      if (x === 0) context.moveTo(x, y + wave)
      else context.lineTo(x, y + wave)
    }
    const shade = 104 + (line % 7) * 11
    context.strokeStyle = `rgb(${shade}, ${shade}, ${shade})`
    context.lineWidth = line % 5 === 0 ? 2 : 1
    context.globalAlpha = 0.32 + (line % 4) * 0.08
    context.stroke()
  }

  context.globalAlpha = 0.18
  for (let dot = 0; dot < 420; dot += 1) {
    const x = (dot * 47) % canvas.width
    const y = (dot * 83) % canvas.height
    const radius = 0.4 + ((dot * 13) % 5) * 0.35
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fillStyle = dot % 2 === 0 ? '#d8d8d8' : '#373737'
    context.fill()
  }

  context.globalAlpha = 1
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.4, 13)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

export function River({
  seed,
  size = 40,
  reducedMotion = false,
}: {
  seed: string
  size?: number
  reducedMotion?: boolean
}) {
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const timeUniform = useRef({ value: 0 })
  const motionUniform = useRef({ value: reducedMotion ? 0 : 1 })
  const flowTexture = useMemo(makeFlowTexture, [])

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

  const compile = useCallback(
    (shader: Shader) => {
      shader.uniforms.uRiverTime = timeUniform.current
      shader.uniforms.uRiverMotion = motionUniform.current
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uRiverTime;
uniform float uRiverMotion;`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position);
float flowWave = sin(uv.y * 92.0 - uRiverTime * 3.2 + uv.x * 8.0);
float crossWave = sin(uv.y * 47.0 - uRiverTime * 2.25 - uv.x * 13.0);
float fineWave = sin(uv.y * 151.0 - uRiverTime * 4.6 + uv.x * 21.0);
transformed.y += (flowWave * 0.006 + crossWave * 0.004 + fineWave * 0.002) * uRiverMotion;`,
        )
    },
    [],
  )

  useEffect(() => {
    motionUniform.current.value = reducedMotion ? 0 : 1
    if (materialRef.current) materialRef.current.needsUpdate = true
  }, [reducedMotion])

  useEffect(() => () => flowTexture.dispose(), [flowTexture])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    timeUniform.current.value = reducedMotion ? 0 : time
    if (reducedMotion) {
      flowTexture.offset.set(0, 0)
      return
    }

    flowTexture.offset.y = -(time * 0.16) % 1
    flowTexture.offset.x = Math.sin(time * 0.11) * 0.035
    if (materialRef.current) {
      materialRef.current.clearcoatRoughness = 0.12 + Math.sin(time * 0.7) * 0.018
    }
  })

  return (
    <mesh geometry={geometry} receiveShadow renderOrder={2}>
      <meshPhysicalMaterial
        ref={materialRef}
        color="#315c54"
        roughness={0.2}
        metalness={0}
        clearcoat={0.82}
        clearcoatRoughness={0.12}
        transmission={0.1}
        transparent
        opacity={0.86}
        depthWrite={false}
        side={THREE.DoubleSide}
        bumpMap={flowTexture}
        bumpScale={0.035}
        emissive="#071a17"
        emissiveIntensity={0.16}
        onBeforeCompile={compile}
        customProgramCacheKey={() => `verdure-river-${reducedMotion ? 0 : 1}`}
      />
    </mesh>
  )
}
