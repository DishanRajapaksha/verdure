import { useCallback, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Shader = Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0]

type TreeWindMaterialProps = {
  map?: THREE.Texture
  strength: number
  leaf?: boolean
  enabled?: boolean
  roughness?: number
  alphaTest?: number
  side?: THREE.Side
}

export function TreeWindMaterial({
  map,
  strength,
  leaf = false,
  enabled = true,
  roughness = 1,
  alphaTest = 0,
  side = THREE.FrontSide,
}: TreeWindMaterialProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const timeUniform = useRef({ value: 0 })

  const compile = useCallback(
    (shader: Shader) => {
      shader.uniforms.uTreeWindTime = timeUniform.current
      shader.uniforms.uTreeWindStrength = { value: enabled ? strength : 0 }
      shader.uniforms.uTreeLeaf = { value: leaf ? 1 : 0 }

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute float aWind;
uniform float uTreeWindTime;
uniform float uTreeWindStrength;
uniform float uTreeLeaf;`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position);
#ifdef USE_INSTANCING
  vec3 treeOrigin = vec3(instanceMatrix[3].x, instanceMatrix[3].y, instanceMatrix[3].z);
#else
  vec3 treeOrigin = vec3(0.0);
#endif
float weather = pow(0.5 + 0.5 * sin(uTreeWindTime * 0.21 + treeOrigin.x * 0.017 - treeOrigin.z * 0.013), 2.35);
float front = 0.5 + 0.5 * sin(treeOrigin.x * 0.12 + treeOrigin.z * 0.07 - uTreeWindTime * 0.85);
float broken = 0.5 + 0.5 * sin(treeOrigin.x * 0.31 - treeOrigin.z * 0.19 - uTreeWindTime * 1.13);
float gust = clamp(0.08 + weather * (0.24 + front * 0.58 + broken * 0.18), 0.0, 1.0);
float phase = uTreeWindTime * (0.72 + gust * 0.8) + treeOrigin.x * 0.36 + treeOrigin.z * 0.28 + position.y * 1.9;
float flex = aWind * uTreeWindStrength;
transformed.x += sin(phase) * flex * (0.22 + gust * 0.98);
transformed.z += cos(phase * 0.79 + 1.3) * flex * (0.14 + gust * 0.62);
if (uTreeLeaf > 0.5) {
  float flutter = sin(uTreeWindTime * (4.3 + gust * 2.2) + position.x * 19.0 + position.z * 13.0);
  transformed.x += flutter * flex * 0.23;
  transformed.y += abs(flutter) * flex * 0.065;
}`,
        )
    },
    [enabled, leaf, strength],
  )

  useEffect(() => {
    if (materialRef.current) materialRef.current.needsUpdate = true
  }, [enabled, leaf, strength])

  useFrame((state) => {
    timeUniform.current.value = enabled ? state.clock.elapsedTime : 0
  })

  return (
    <meshStandardMaterial
      ref={materialRef}
      map={map}
      roughness={roughness}
      metalness={0}
      alphaTest={alphaTest}
      transparent={alphaTest > 0}
      side={side}
      vertexColors={leaf}
      onBeforeCompile={compile}
      customProgramCacheKey={() => `verdure-tree-wind-${leaf ? 1 : 0}-${enabled ? 1 : 0}-${strength}`}
    />
  )
}
