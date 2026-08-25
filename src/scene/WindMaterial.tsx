import { useCallback, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Shader = Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0]

type WindStandardMaterialProps = {
  strength: number
  whole?: boolean
  enabled?: boolean
  roughness?: number
  metalness?: number
  side?: THREE.Side
}

export function WindStandardMaterial({
  strength,
  whole = false,
  enabled = true,
  roughness = 1,
  metalness = 0,
  side = THREE.FrontSide,
}: WindStandardMaterialProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const timeUniform = useRef({ value: 0 })

  const compile = useCallback(
    (shader: Shader) => {
      shader.uniforms.uWindTime = timeUniform.current
      shader.uniforms.uWindStrength = { value: enabled ? strength : 0 }
      shader.uniforms.uWindWhole = { value: whole ? 1 : 0 }

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uWindTime;
uniform float uWindStrength;
uniform float uWindWhole;`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position);
#ifdef USE_INSTANCING
  vec3 windOrigin = vec3(instanceMatrix[3].x, instanceMatrix[3].y, instanceMatrix[3].z);
#else
  vec3 windOrigin = vec3(0.0);
#endif
float heightMask = clamp(position.y + 0.45, 0.0, 1.0);
heightMask = mix(heightMask, 1.0, uWindWhole);
float gust = 0.55 + 0.45 * sin(uWindTime * 0.37 + windOrigin.x * 0.18 - windOrigin.z * 0.14);
float phase = uWindTime * (0.88 + gust * 0.34) + windOrigin.x * 0.42 + windOrigin.z * 0.31;
transformed.x += sin(phase) * uWindStrength * heightMask * (0.58 + gust * 0.42);
transformed.z += cos(phase * 0.83 + 1.7) * uWindStrength * 0.55 * heightMask;`,
        )
    },
    [enabled, strength, whole],
  )

  useEffect(() => {
    if (materialRef.current) materialRef.current.needsUpdate = true
  }, [enabled, strength, whole])

  useFrame((state) => {
    timeUniform.current.value = enabled ? state.clock.elapsedTime : 0
  })

  return (
    <meshStandardMaterial
      ref={materialRef}
      roughness={roughness}
      metalness={metalness}
      side={side}
      onBeforeCompile={compile}
      customProgramCacheKey={() => `verdure-wind-${whole ? 1 : 0}-${enabled ? 1 : 0}-${strength}`}
    />
  )
}
