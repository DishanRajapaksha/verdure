import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { terrainHeight } from '../lib/forest'

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])

export function WanderControls({ enabled, seed }: { enabled: boolean; seed: string }) {
  const { camera, gl } = useThree()
  const keys = useRef(new Set<string>())
  const dragging = useRef(false)
  const yaw = useRef(0)
  const pitch = useRef(-0.12)
  const wheelImpulse = useRef(0)
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())

  useEffect(() => {
    if (!enabled) {
      keys.current.clear()
      dragging.current = false
      wheelImpulse.current = 0
      return
    }

    const element = gl.domElement

    const onPointerDown = (event: PointerEvent) => {
      dragging.current = true
      element.setPointerCapture?.(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current) return
      yaw.current -= event.movementX * 0.0021
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - event.movementY * 0.0017,
        -0.62,
        0.42,
      )
    }

    const onPointerUp = (event: PointerEvent) => {
      dragging.current = false
      if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId)
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      wheelImpulse.current = THREE.MathUtils.clamp(
        wheelImpulse.current + event.deltaY * -0.0035,
        -1.4,
        1.4,
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!MOVE_KEYS.has(key)) return
      keys.current.add(key)
      event.preventDefault()
    }

    const onKeyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.key.toLowerCase())
    }

    const onBlur = () => keys.current.clear()

    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerUp)
    element.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerUp)
      element.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [enabled, gl])

  useFrame((_, delta) => {
    if (!enabled) return

    const held = keys.current
    const forwardInput =
      (held.has('w') || held.has('arrowup') ? 1 : 0) -
      (held.has('s') || held.has('arrowdown') ? 1 : 0)
    const strafeInput =
      (held.has('d') || held.has('arrowright') ? 1 : 0) -
      (held.has('a') || held.has('arrowleft') ? 1 : 0)

    const drift = wheelImpulse.current
    wheelImpulse.current = THREE.MathUtils.damp(wheelImpulse.current, 0, 5.5, delta)

    forward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    right.current.set(Math.cos(yaw.current), 0, Math.sin(yaw.current))

    const speed = 2.45 * delta
    camera.position.addScaledVector(forward.current, (forwardInput + drift) * speed)
    camera.position.addScaledVector(right.current, strafeInput * speed)
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -18.2, 18.2)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -18.2, 18.2)

    const eyeHeight = terrainHeight(camera.position.x, camera.position.z, seed) + 1.55
    camera.position.y = THREE.MathUtils.damp(camera.position.y, eyeHeight, 5.2, delta)

    euler.current.set(pitch.current, yaw.current, 0)
    camera.quaternion.setFromEuler(euler.current)
  })

  return null
}
