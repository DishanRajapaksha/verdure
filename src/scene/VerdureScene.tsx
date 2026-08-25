import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ExperienceMode } from '../App'
import { Terrain } from './Terrain'
import { River } from './River'
import { Forest } from './Forest'
import { Atmosphere } from './Atmosphere'
import { Gem } from './Gem'
import { WanderControls } from './WanderControls'

function CameraRig({
  mode,
  reducedMotion,
  onWanderReady,
}: {
  mode: ExperienceMode
  reducedMotion: boolean
  onWanderReady: (ready: boolean) => void
}) {
  const { camera } = useThree()
  const previousMode = useRef(mode)
  const transitionRemaining = useRef(reducedMotion ? 0 : 2.2)

  useEffect(() => {
    if (previousMode.current !== mode) previousMode.current = mode
    transitionRemaining.current = reducedMotion ? 0.04 : 2.2
    onWanderReady(false)

    const timer = window.setTimeout(
      () => onWanderReady(mode === 'immersed'),
      reducedMotion ? 40 : 1900,
    )
    return () => window.clearTimeout(timer)
  }, [mode, reducedMotion, onWanderReady])

  useFrame((_, delta) => {
    if (transitionRemaining.current <= 0) return
    transitionRemaining.current -= delta

    const specimen = mode === 'specimen'
    const targetPosition = specimen
      ? new THREE.Vector3(0, 0.15, 16.5)
      : new THREE.Vector3(0, 2.5, 8.2)
    const lookAt = specimen
      ? new THREE.Vector3(0, 0, 0)
      : new THREE.Vector3(0, 1.15, 0)

    if (reducedMotion) {
      camera.position.copy(targetPosition)
      camera.lookAt(lookAt)
      transitionRemaining.current = 0
      return
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPosition.x, 2.2, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPosition.y, 2.2, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPosition.z, 2.2, delta)
    camera.lookAt(lookAt)
  })

  return null
}

function World({
  mode,
  seed,
  reducedMotion,
}: {
  mode: ExperienceMode
  seed: string
  reducedMotion: boolean
}) {
  const world = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!world.current) return
    const targetScale = mode === 'specimen' ? 0.135 : 1
    const targetRotation = mode === 'specimen' ? Math.PI * 0.48 : 0
    const targetY = mode === 'specimen' ? -0.1 : -0.7

    if (reducedMotion) {
      world.current.scale.setScalar(targetScale)
      world.current.rotation.x = targetRotation
      world.current.position.y = targetY
      return
    }

    const next = THREE.MathUtils.damp(world.current.scale.x, targetScale, 1.9, delta)
    world.current.scale.setScalar(next)
    world.current.rotation.x = THREE.MathUtils.damp(world.current.rotation.x, targetRotation, 1.75, delta)
    world.current.position.y = THREE.MathUtils.damp(world.current.position.y, targetY, 1.8, delta)
  })

  return (
    <group ref={world} scale={0.135} rotation={[Math.PI * 0.48, 0, 0]}>
      <Terrain seed={seed} />
      <River seed={seed} />
      <Forest seed={seed} />
      <Atmosphere seed={seed} />
    </group>
  )
}

function Specimen({
  mode,
  seed,
  reducedMotion,
}: {
  mode: ExperienceMode
  seed: string
  reducedMotion: boolean
}) {
  const root = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!root.current) return
    const targetX = mode === 'specimen' && !reducedMotion ? state.pointer.y * 0.075 : 0
    const targetY = mode === 'specimen' && !reducedMotion ? state.pointer.x * 0.11 : 0
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, targetX, 2.6, delta)
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, targetY, 2.6, delta)
  })

  return (
    <group ref={root}>
      <World mode={mode} seed={seed} reducedMotion={reducedMotion} />
      <Gem mode={mode} seed={seed} />
    </group>
  )
}

function SceneContents({
  mode,
  seed,
  reducedMotion,
}: {
  mode: ExperienceMode
  seed: string
  reducedMotion: boolean
}) {
  const [wanderReady, setWanderReady] = useState(false)

  return (
    <>
      <color attach="background" args={['#07100c']} />
      <fog attach="fog" args={['#0a1510', 11, 38]} />
      <ambientLight intensity={0.31} />
      <hemisphereLight args={['#c9d6bc', '#07100c', 1.05]} />
      <directionalLight
        position={[7, 12, 6]}
        intensity={2.45}
        color="#d9e5c4"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={0.5}
        shadow-camera-far={42}
        shadow-bias={-0.00035}
        shadow-normalBias={0.035}
      />
      <pointLight position={[-7, 2, 5]} intensity={10} distance={18} color="#9a88ad" />
      <Specimen mode={mode} seed={seed} reducedMotion={reducedMotion} />
      <CameraRig mode={mode} reducedMotion={reducedMotion} onWanderReady={setWanderReady} />
      <WanderControls enabled={mode === 'immersed' && wanderReady} seed={seed} />
    </>
  )
}

export function VerdureScene({
  mode,
  seed,
  reducedMotion,
}: {
  mode: ExperienceMode
  seed: string
  reducedMotion: boolean
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.15, 16.5], fov: 42, near: 0.05, far: 90 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.shadowMap.enabled = true
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <SceneContents mode={mode} seed={seed} reducedMotion={reducedMotion} />
    </Canvas>
  )
}
