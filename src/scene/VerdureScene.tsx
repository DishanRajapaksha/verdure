import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { ExperienceMode } from '../App'
import { Terrain } from './Terrain'
import { Forest } from './Forest'
import { Atmosphere } from './Atmosphere'
import { Gem } from './Gem'

function CameraRig({ mode }: { mode: ExperienceMode }) {
  const { camera } = useThree()
  const previousMode = useRef(mode)
  const transitionRemaining = useRef(2.2)
  const [controlsReady, setControlsReady] = useState(false)

  useEffect(() => {
    if (previousMode.current !== mode) {
      previousMode.current = mode
      transitionRemaining.current = 2.2
      setControlsReady(false)
    }

    const timer = window.setTimeout(() => setControlsReady(mode === 'immersed'), 1900)
    return () => window.clearTimeout(timer)
  }, [mode])

  useFrame((_, delta) => {
    if (transitionRemaining.current <= 0) return
    transitionRemaining.current -= delta

    const targetPosition = mode === 'specimen'
      ? new THREE.Vector3(0, 0.15, 16.5)
      : new THREE.Vector3(0, 2.5, 8.2)
    const lookAt = mode === 'specimen'
      ? new THREE.Vector3(0, 0, 0)
      : new THREE.Vector3(0, 1.15, 0)

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPosition.x, 2.2, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPosition.y, 2.2, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPosition.z, 2.2, delta)
    camera.lookAt(lookAt)
  })

  return mode === 'immersed' ? (
    <OrbitControls
      enabled={controlsReady}
      target={[0, 1.15, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.045}
      minDistance={3.5}
      maxDistance={13}
      minPolarAngle={Math.PI * 0.25}
      maxPolarAngle={Math.PI * 0.56}
      rotateSpeed={0.28}
      zoomSpeed={0.35}
    />
  ) : null
}

function World({ mode, seed }: { mode: ExperienceMode; seed: string }) {
  const world = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!world.current) return
    const targetScale = mode === 'specimen' ? 0.135 : 1
    const current = world.current.scale.x
    const next = THREE.MathUtils.damp(current, targetScale, 1.9, delta)
    world.current.scale.setScalar(next)
    world.current.rotation.x = THREE.MathUtils.damp(
      world.current.rotation.x,
      mode === 'specimen' ? Math.PI * 0.48 : 0,
      1.75,
      delta,
    )
    world.current.position.y = THREE.MathUtils.damp(
      world.current.position.y,
      mode === 'specimen' ? -0.1 : -0.7,
      1.8,
      delta,
    )
  })

  return (
    <group ref={world} scale={0.135} rotation={[Math.PI * 0.48, 0, 0]}>
      <Terrain seed={seed} />
      <Forest seed={seed} />
      <Atmosphere seed={seed} />
    </group>
  )
}

function Specimen({ mode, seed }: { mode: ExperienceMode; seed: string }) {
  const root = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!root.current) return
    const targetX = mode === 'specimen' ? state.pointer.y * 0.075 : 0
    const targetY = mode === 'specimen' ? state.pointer.x * 0.11 : 0
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, targetX, 2.6, delta)
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, targetY, 2.6, delta)
  })

  return (
    <group ref={root}>
      <World mode={mode} seed={seed} />
      <Gem mode={mode} seed={seed} />
    </group>
  )
}

export function VerdureScene({ mode, seed }: { mode: ExperienceMode; seed: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0.15, 16.5], fov: 42, near: 0.05, far: 90 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <color attach="background" args={['#07100c']} />
      <fog attach="fog" args={['#0a1510', 11, 38]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#c9d6bc', '#07100c', 1.35]} />
      <directionalLight position={[6, 10, 7]} intensity={2.2} color="#d9e5c4" />
      <pointLight position={[-7, 2, 5]} intensity={12} distance={18} color="#9a88ad" />
      <Specimen mode={mode} seed={seed} />
      <CameraRig mode={mode} />
    </Canvas>
  )
}
