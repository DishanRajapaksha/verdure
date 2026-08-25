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
          `#include <common>\nuniform float uWindTime;\nuniform float uWindStrength;\nuniform float uWindWhole;`,
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
float weather = pow(0.5 + 0.5 * sin(uWindTime * 0.21), 2.35);
float gustFront = 0.5 + 0.5 * sin(windOrigin.x * 0.12 + windOrigin.z * 0.07 - uWindTime * 0.85);
float brokenFront = 0.5 + 0.5 * sin(windOrigin.x * 0.31 - windOrigin.z * 0.19 - uWindTime * 1.13 + 1.7);
float gust = clamp(0.08 + weather * (0.24 + gustFront * 0.58 + brokenFront * 0.18), 0.0, 1.0);
float phase = uWindTime * (0.62 + gust * 0.72) + windOrigin.x * 0.42 + windOrigin.z * 0.31;
float displacement = uWindStrength * heightMask * (0.16 + gust * 0.84);
transformed.x += sin(phase) * displacement;
transformed.z += cos(phase * 0.83 + 1.7) * displacement * 0.55;`,
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
      customProgramCacheKey={() => `verdure-wind-fronts-${whole ? 1 : 0}-${enabled ? 1 : 0}-${strength}`}
    />
  )
}
