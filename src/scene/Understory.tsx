import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { UnderstoryPlacement } from '../lib/forest'

const fernDark = new THREE.Color('#294626')
const fernLight = new THREE.Color('#76944b')
const shrubDark = new THREE.Color('#1d351c')
const shrubLight = new THREE.Color('#667d37')
const grassDark = new THREE.Color('#405126')
const grassLight = new THREE.Color('#87924a')
const mossDark = new THREE.Color('#334523')
const mossLight = new THREE.Color('#73834a')
const mushroomStem = new THREE.Color('#b6ad8f')
const mushroomCapDark = new THREE.Color('#695342')
const mushroomCapLight = new THREE.Color('#b28c68')
const saplingStem = new THREE.Color('#57422c')
const saplingLeafDark = new THREE.Color('#31512b')
const saplingLeafLight = new THREE.Color('#87a458')

const fernFronds = 6
const shrubClumps = 3
const grassBlades = 5
const mossClumps = 3
const saplingLeaves = 4

export function Understory({ plants }: { plants: UnderstoryPlacement[] }) {
  const groups = useMemo(
    () => ({
      ferns: plants.filter((plant) => plant.kind === 'fern'),
      shrubs: plants.filter((plant) => plant.kind === 'shrub'),
      grasses: plants.filter((plant) => plant.kind === 'grass'),
      mushrooms: plants.filter((plant) => plant.kind === 'mushroom'),
      mosses: plants.filter((plant) => plant.kind === 'moss'),
      saplings: plants.filter((plant) => plant.kind === 'sapling'),
    }),
    [plants],
  )

  const fernRef = useRef<THREE.InstancedMesh>(null)
  const shrubRef = useRef<THREE.InstancedMesh>(null)
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const mossRef = useRef<THREE.InstancedMesh>(null)
  const mushroomStemRef = useRef<THREE.InstancedMesh>(null)
  const mushroomCapRef = useRef<THREE.InstancedMesh>(null)
  const saplingStemRef = useRef<THREE.InstancedMesh>(null)
  const saplingLeafRef = useRef<THREE.InstancedMesh>(null)

  const fernGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(0.18, 0.82, 1, 4)
    geometry.translate(0, 0.41, 0)
    const positions = geometry.attributes.position
    for (let index = 0; index < positions.count; index += 1) {
      const y = positions.getY(index)
      const taper = Math.sin(Math.min(1, y / 0.82) * Math.PI)
      positions.setX(index, positions.getX(index) * (0.36 + taper * 0.64))
    }
    positions.needsUpdate = true
    return geometry
  }, [])
  const shrubGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.28, 1), [])
  const grassGeometry = useMemo(() => new THREE.ConeGeometry(0.045, 0.72, 3), [])
  const mossGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.22, 1), [])
  const mushroomStemGeometry = useMemo(() => new THREE.CylinderGeometry(0.035, 0.05, 0.34, 6), [])
  const mushroomCapGeometry = useMemo(
    () => new THREE.SphereGeometry(0.18, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.52),
    [],
  )
  const saplingStemGeometry = useMemo(() => new THREE.CylinderGeometry(0.025, 0.04, 0.72, 5), [])
  const saplingLeafGeometry = useMemo(() => new THREE.IcosahedronGeometry(0.18, 1), [])

  useLayoutEffect(() => {
    const mesh = fernRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    groups.ferns.forEach((plant, plantIndex) => {
      for (let frond = 0; frond < fernFronds; frond += 1) {
        const index = plantIndex * fernFronds + frond
        const angle = plant.rotation + (frond / fernFronds) * Math.PI * 2
        const radial = plant.scale * 0.065
        position.set(
          plant.x + Math.cos(angle) * radial,
          plant.y + 0.015,
          plant.z + Math.sin(angle) * radial,
        )
        euler.set(
          Math.sin(angle) * 0.7,
          angle,
          Math.cos(angle) * 0.7,
          'YXZ',
        )
        quaternion.setFromEuler(euler)
        const length = plant.scale * (0.58 + (frond % 3) * 0.09)
        scale.set(length * 0.7, length, 1)
        matrix.compose(position, quaternion, scale)
        mesh.setMatrixAt(index, matrix)
        colour.copy(fernDark).lerp(fernLight, plant.tint * 0.72 + (frond % 2) * 0.08)
        mesh.setColorAt(index, colour)
      }
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [groups.ferns])

  useLayoutEffect(() => {
    const mesh = shrubRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()
    const offsets = [
      [-0.17, 0.19, 0.03, 1],
      [0.16, 0.22, 0.08, 0.88],
      [0.01, 0.31, -0.12, 0.78],
    ] as const

    groups.shrubs.forEach((plant, plantIndex) => {
      offsets.forEach(([ox, oy, oz, weight], clump) => {
        const index = plantIndex * shrubClumps + clump
        position.set(
          plant.x + ox * plant.scale,
          plant.y + oy * plant.scale,
          plant.z + oz * plant.scale,
        )
        euler.set(clump * 0.19, plant.rotation + clump * 1.8, clump * 0.13)
        quaternion.setFromEuler(euler)
        scale.setScalar(plant.scale * weight)
        matrix.compose(position, quaternion, scale)
        mesh.setMatrixAt(index, matrix)
        colour.copy(shrubDark).lerp(shrubLight, plant.tint * 0.68 + clump * 0.06)
        mesh.setColorAt(index, colour)
      })
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [groups.shrubs])

  useLayoutEffect(() => {
    const mesh = grassRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    groups.grasses.forEach((plant, plantIndex) => {
      for (let blade = 0; blade < grassBlades; blade += 1) {
        const index = plantIndex * grassBlades + blade
        const angle = plant.rotation + blade * 2.39996
        const radius = plant.scale * 0.07 * (blade % 2 === 0 ? 1 : 0.55)
        const height = plant.scale * (0.52 + (blade % 3) * 0.1)
        position.set(
          plant.x + Math.cos(angle) * radius,
          plant.y + height * 0.36,
          plant.z + Math.sin(angle) * radius,
        )
        euler.set(Math.sin(angle) * 0.14, angle, Math.cos(angle) * 0.14)
        quaternion.setFromEuler(euler)
        scale.set(0.7 + (blade % 2) * 0.18, height, 0.7)
        matrix.compose(position, quaternion, scale)
        mesh.setMatrixAt(index, matrix)
        colour.copy(grassDark).lerp(grassLight, plant.tint * 0.66 + blade * 0.025)
        mesh.setColorAt(index, colour)
      }
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [groups.grasses])

  useLayoutEffect(() => {
    const mesh = mossRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    groups.mosses.forEach((plant, plantIndex) => {
      for (let clump = 0; clump < mossClumps; clump += 1) {
        const index = plantIndex * mossClumps + clump
        const angle = plant.rotation + clump * 2.13
        const radius = plant.scale * 0.18
        position.set(
          plant.x + Math.cos(angle) * radius,
          plant.y + 0.02 + clump * 0.008,
          plant.z + Math.sin(angle) * radius,
        )
        euler.set(0, angle, 0)
        quaternion.setFromEuler(euler)
        const width = plant.scale * (0.62 + clump * 0.09)
        scale.set(width, plant.scale * 0.12, width * (0.72 + clump * 0.08))
        matrix.compose(position, quaternion, scale)
        mesh.setMatrixAt(index, matrix)
        colour.copy(mossDark).lerp(mossLight, plant.tint * 0.62 + plant.wetness * 0.18)
        mesh.setColorAt(index, colour)
      }
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [groups.mosses])

  useLayoutEffect(() => {
    const stems = mushroomStemRef.current
    const caps = mushroomCapRef.current
    if (!stems || !caps) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    groups.mushrooms.forEach((plant, index) => {
      const height = plant.scale * 0.34
      euler.set(0, plant.rotation, (plant.tint - 0.5) * 0.12)
      quaternion.setFromEuler(euler)

      position.set(plant.x, plant.y + height * 0.5, plant.z)
      scale.set(plant.scale * 0.82, plant.scale, plant.scale * 0.82)
      matrix.compose(position, quaternion, scale)
      stems.setMatrixAt(index, matrix)
      stems.setColorAt(index, mushroomStem)

      position.set(plant.x, plant.y + height, plant.z)
      scale.setScalar(plant.scale * (0.88 + plant.wetness * 0.18))
      matrix.compose(position, quaternion, scale)
      caps.setMatrixAt(index, matrix)
      colour.copy(mushroomCapDark).lerp(mushroomCapLight, plant.tint * 0.82)
      caps.setColorAt(index, colour)
    })

    stems.instanceMatrix.needsUpdate = true
    caps.instanceMatrix.needsUpdate = true
    if (stems.instanceColor) stems.instanceColor.needsUpdate = true
    if (caps.instanceColor) caps.instanceColor.needsUpdate = true
  }, [groups.mushrooms])

  useLayoutEffect(() => {
    const stems = saplingStemRef.current
    const leaves = saplingLeafRef.current
    if (!stems || !leaves) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    groups.saplings.forEach((plant, plantIndex) => {
      const height = plant.scale * 0.72
      euler.set(0, plant.rotation, (plant.tint - 0.5) * 0.09)
      quaternion.setFromEuler(euler)
      position.set(plant.x, plant.y + height * 0.5, plant.z)
      scale.set(plant.scale * 0.78, plant.scale, plant.scale * 0.78)
      matrix.compose(position, quaternion, scale)
      stems.setMatrixAt(plantIndex, matrix)
      stems.setColorAt(plantIndex, saplingStem)

      for (let leaf = 0; leaf < saplingLeaves; leaf += 1) {
        const index = plantIndex * saplingLeaves + leaf
        const angle = plant.rotation + leaf * 1.5708
        const radius = plant.scale * 0.14
        position.set(
          plant.x + Math.cos(angle) * radius,
          plant.y + height * (0.66 + (leaf % 2) * 0.18),
          plant.z + Math.sin(angle) * radius,
        )
        euler.set(leaf * 0.17, angle, leaf * 0.11)
        quaternion.setFromEuler(euler)
        const leafScale = plant.scale * (0.74 + (leaf % 2) * 0.16)
        scale.set(leafScale * 0.9, leafScale * 0.58, leafScale)
        matrix.compose(position, quaternion, scale)
        leaves.setMatrixAt(index, matrix)
        colour.copy(saplingLeafDark).lerp(saplingLeafLight, plant.tint * 0.7 + leaf * 0.04)
        leaves.setColorAt(index, colour)
      }
    })

    stems.instanceMatrix.needsUpdate = true
    leaves.instanceMatrix.needsUpdate = true
    if (stems.instanceColor) stems.instanceColor.needsUpdate = true
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true
  }, [groups.saplings])

  return (
    <group>
      {groups.ferns.length > 0 && (
        <instancedMesh ref={fernRef} args={[fernGeometry, undefined, groups.ferns.length * fernFronds]}>
          <meshStandardMaterial roughness={1} metalness={0} side={THREE.DoubleSide} />
        </instancedMesh>
      )}
      {groups.shrubs.length > 0 && (
        <instancedMesh ref={shrubRef} args={[shrubGeometry, undefined, groups.shrubs.length * shrubClumps]} castShadow>
          <meshStandardMaterial roughness={1} metalness={0} />
        </instancedMesh>
      )}
      {groups.grasses.length > 0 && (
        <instancedMesh ref={grassRef} args={[grassGeometry, undefined, groups.grasses.length * grassBlades]}>
          <meshStandardMaterial roughness={1} metalness={0} side={THREE.DoubleSide} />
        </instancedMesh>
      )}
      {groups.mosses.length > 0 && (
        <instancedMesh ref={mossRef} args={[mossGeometry, undefined, groups.mosses.length * mossClumps]} receiveShadow>
          <meshStandardMaterial roughness={1} metalness={0} />
        </instancedMesh>
      )}
      {groups.mushrooms.length > 0 && (
        <>
          <instancedMesh ref={mushroomStemRef} args={[mushroomStemGeometry, undefined, groups.mushrooms.length]} castShadow>
            <meshStandardMaterial roughness={1} metalness={0} />
          </instancedMesh>
          <instancedMesh ref={mushroomCapRef} args={[mushroomCapGeometry, undefined, groups.mushrooms.length]} castShadow>
            <meshStandardMaterial roughness={0.92} metalness={0} />
          </instancedMesh>
        </>
      )}
      {groups.saplings.length > 0 && (
        <>
          <instancedMesh ref={saplingStemRef} args={[saplingStemGeometry, undefined, groups.saplings.length]} castShadow>
            <meshStandardMaterial roughness={1} metalness={0} />
          </instancedMesh>
          <instancedMesh ref={saplingLeafRef} args={[saplingLeafGeometry, undefined, groups.saplings.length * saplingLeaves]} castShadow>
            <meshStandardMaterial roughness={0.98} metalness={0} />
          </instancedMesh>
        </>
      )}
    </group>
  )
}
