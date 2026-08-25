import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { generateForest, generateRocks, generateUnderstory } from '../lib/forest'
import type { TreePlacement } from '../lib/forest'
import { Understory } from './Understory'
import { WindStandardMaterial } from './WindMaterial'

const trunkDark = new THREE.Color('#3d2d22')
const trunkWarm = new THREE.Color('#6a4a31')
const silverTrunk = new THREE.Color('#9a927f')
const darkLeaf = new THREE.Color('#1d351b')
const lightLeaf = new THREE.Color('#789447')
const silverLeaf = new THREE.Color('#a6b782')
const coniferDark = new THREE.Color('#173021')
const coniferLight = new THREE.Color('#456743')
const darkRock = new THREE.Color('#2b322a')
const mossRock = new THREE.Color('#576b35')

const broadleafClumps = [
  [-0.34, 0.66, 0.03, 0.92],
  [0.3, 0.7, 0.15, 0.83],
  [0.04, 0.83, -0.24, 0.8],
  [-0.12, 0.94, 0.03, 0.68],
  [0.12, 0.78, 0.33, 0.72],
  [-0.3, 0.79, -0.22, 0.7],
  [0.3, 0.86, -0.08, 0.62],
] as const

const branchCount = 4
const coniferLayers = 4

function treeTrunkColour(tree: TreePlacement, target: THREE.Color) {
  if (tree.species === 'silverleaf') return target.copy(silverTrunk).lerp(trunkWarm, tree.tint * 0.18)
  if (tree.species === 'ancient') return target.copy(trunkDark).lerp(trunkWarm, 0.2 + tree.tint * 0.22)
  return target.copy(trunkDark).lerp(trunkWarm, 0.25 + tree.tint * 0.4)
}

export function Forest({
  seed,
  size = 40,
  reducedMotion = false,
}: {
  seed: string
  size?: number
  reducedMotion?: boolean
}) {
  const trees = useMemo(() => generateForest(seed, size), [seed, size])
  const rocks = useMemo(() => generateRocks(seed, size), [seed, size])
  const understory = useMemo(() => generateUnderstory(seed, size), [seed, size])
  const broadleafTrees = useMemo(() => trees.filter((tree) => tree.species !== 'conifer'), [trees])
  const conifers = useMemo(() => trees.filter((tree) => tree.species === 'conifer'), [trees])

  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const branchRef = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)
  const coniferRef = useRef<THREE.InstancedMesh>(null)
  const rockRef = useRef<THREE.InstancedMesh>(null)

  const trunkGeometry = useMemo(() => new THREE.CylinderGeometry(0.075, 0.13, 1, 7), [])
  const branchGeometry = useMemo(() => new THREE.CylinderGeometry(0.024, 0.055, 1, 6), [])
  const canopyGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.58, 1), [])
  const coniferGeometry = useMemo(() => new THREE.ConeGeometry(0.72, 1.35, 8), [])
  const rockGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.5, 1), [])

  useLayoutEffect(() => {
    const trunk = trunkRef.current
    const branches = branchRef.current
    if (!trunk || !branches) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()
    const start = new THREE.Vector3()
    const end = new THREE.Vector3()
    const direction = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)

    trees.forEach((tree, treeIndex) => {
      euler.set(tree.lean * 0.3, tree.rotation, tree.lean)
      quaternion.setFromEuler(euler)
      position.set(tree.x, tree.y + tree.height * 0.5, tree.z)
      scale.set(tree.girth, tree.height, tree.girth)
      matrix.compose(position, quaternion, scale)
      trunk.setMatrixAt(treeIndex, matrix)
      trunk.setColorAt(treeIndex, treeTrunkColour(tree, colour))

      for (let branch = 0; branch < branchCount; branch += 1) {
        const index = treeIndex * branchCount + branch
        const radialAngle = tree.rotation + branch * 2.17 + tree.tint * 0.7
        const branchHeight = tree.y + tree.height * (0.47 + branch * 0.09)
        const branchLength = tree.height * (0.16 + (branch % 2) * 0.035) * tree.branchiness
        const rise = branchLength * (tree.species === 'conifer' ? 0.18 : 0.36)
        start.set(tree.x, branchHeight, tree.z)
        end.set(
          tree.x + Math.cos(radialAngle) * branchLength,
          branchHeight + rise,
          tree.z + Math.sin(radialAngle) * branchLength,
        )
        direction.subVectors(end, start)
        const length = direction.length()
        position.copy(start).add(end).multiplyScalar(0.5)
        quaternion.setFromUnitVectors(up, direction.normalize())
        const thickness = tree.girth * (0.38 - branch * 0.045)
        scale.set(thickness, length, thickness)
        matrix.compose(position, quaternion, scale)
        branches.setMatrixAt(index, matrix)
        branches.setColorAt(index, treeTrunkColour(tree, colour).multiplyScalar(0.94))
      }
    })

    trunk.instanceMatrix.needsUpdate = true
    branches.instanceMatrix.needsUpdate = true
    if (trunk.instanceColor) trunk.instanceColor.needsUpdate = true
    if (branches.instanceColor) branches.instanceColor.needsUpdate = true
  }, [trees])

  useLayoutEffect(() => {
    const canopy = canopyRef.current
    if (!canopy) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    broadleafTrees.forEach((tree, treeIndex) => {
      broadleafClumps.forEach(([ox, oy, oz, clumpScale], clumpIndex) => {
        const index = treeIndex * broadleafClumps.length + clumpIndex
        const spread = tree.canopy * tree.height * (tree.species === 'ancient' ? 0.31 : 0.25)
        const silverNarrowing = tree.species === 'silverleaf' ? 0.82 : 1
        position.set(
          tree.x + ox * spread * silverNarrowing,
          tree.y + tree.height * oy,
          tree.z + oz * spread * silverNarrowing,
        )
        euler.set(
          (clumpIndex * 0.61 + tree.tint) * 0.16,
          tree.rotation + clumpIndex * 1.37,
          clumpIndex * 0.19 + tree.lean * 0.6,
        )
        quaternion.setFromEuler(euler)
        const radius = tree.canopy * clumpScale * (0.68 + tree.height * 0.135)
        const ancientWidth = tree.species === 'ancient' ? 1.18 : 1
        scale.set(radius * 1.08 * ancientWidth, radius, radius * 0.92 * ancientWidth)
        matrix.compose(position, quaternion, scale)
        canopy.setMatrixAt(index, matrix)

        if (tree.species === 'silverleaf') {
          colour.copy(darkLeaf).lerp(silverLeaf, 0.48 + tree.tint * 0.42 + clumpIndex * 0.015)
        } else {
          colour.copy(darkLeaf).lerp(lightLeaf, 0.15 + tree.tint * 0.68 + clumpIndex * 0.025)
        }
        canopy.setColorAt(index, colour)
      })
    })

    canopy.instanceMatrix.needsUpdate = true
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
  }, [broadleafTrees])

  useLayoutEffect(() => {
    const mesh = coniferRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    conifers.forEach((tree, treeIndex) => {
      for (let layer = 0; layer < coniferLayers; layer += 1) {
        const index = treeIndex * coniferLayers + layer
        const t = layer / (coniferLayers - 1)
        const layerWidth = tree.canopy * (1.04 - t * 0.55)
        const layerHeight = tree.height * (0.28 - t * 0.025)
        position.set(
          tree.x + Math.sin(tree.rotation + layer) * tree.lean * 0.35,
          tree.y + tree.height * (0.52 + layer * 0.115),
          tree.z + Math.cos(tree.rotation + layer) * tree.lean * 0.35,
        )
        euler.set(tree.lean * 0.2, tree.rotation + layer * 0.42, tree.lean * 0.4)
        quaternion.setFromEuler(euler)
        scale.set(layerWidth, layerHeight, layerWidth)
        matrix.compose(position, quaternion, scale)
        mesh.setMatrixAt(index, matrix)
        colour.copy(coniferDark).lerp(coniferLight, tree.tint * 0.6 + layer * 0.055)
        mesh.setColorAt(index, colour)
      }
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [conifers])

  useLayoutEffect(() => {
    const mesh = rockRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    rocks.forEach((rock, index) => {
      position.set(rock.x, rock.y, rock.z)
      euler.set(rock.rotation * 0.2, rock.rotation, rock.rotation * 0.12)
      quaternion.setFromEuler(euler)
      scale.set(rock.scale * 1.5, rock.scale * 0.7, rock.scale)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
      colour.copy(darkRock).lerp(mossRock, rock.tint * 0.72)
      mesh.setColorAt(index, colour)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [rocks])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeometry, undefined, trees.length]} castShadow>
        <meshStandardMaterial roughness={1} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={branchRef} args={[branchGeometry, undefined, trees.length * branchCount]} castShadow>
        <meshStandardMaterial roughness={1} metalness={0} />
      </instancedMesh>
      {broadleafTrees.length > 0 && (
        <instancedMesh
          ref={canopyRef}
          args={[canopyGeometry, undefined, broadleafTrees.length * broadleafClumps.length]}
          castShadow
        >
          <WindStandardMaterial
            strength={0.095}
            whole
            enabled={!reducedMotion}
            roughness={0.97}
            metalness={0}
          />
        </instancedMesh>
      )}
      {conifers.length > 0 && (
        <instancedMesh ref={coniferRef} args={[coniferGeometry, undefined, conifers.length * coniferLayers]} castShadow>
          <WindStandardMaterial
            strength={0.062}
            whole
            enabled={!reducedMotion}
            roughness={0.98}
            metalness={0}
          />
        </instancedMesh>
      )}
      <instancedMesh ref={rockRef} args={[rockGeometry, undefined, rocks.length]} receiveShadow>
        <meshStandardMaterial roughness={1} metalness={0} />
      </instancedMesh>
      <Understory plants={understory} reducedMotion={reducedMotion} />
    </group>
  )
}
