import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { generateForest, generateRocks } from '../lib/forest'

const trunkColour = new THREE.Color('#4b3828')
const darkLeaf = new THREE.Color('#233d1d')
const lightLeaf = new THREE.Color('#718d38')
const darkRock = new THREE.Color('#2b322a')
const mossRock = new THREE.Color('#576b35')

export function Forest({ seed, size = 40 }: { seed: string; size?: number }) {
  const trees = useMemo(() => generateForest(seed, size), [seed, size])
  const rocks = useMemo(() => generateRocks(seed, size), [seed, size])
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)
  const rockRef = useRef<THREE.InstancedMesh>(null)

  const trunkGeometry = useMemo(() => new THREE.CylinderGeometry(0.075, 0.12, 1, 5), [])
  const canopyGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.58, 1), [])
  const rockGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.5, 0), [])

  useLayoutEffect(() => {
    const trunk = trunkRef.current
    const canopy = canopyRef.current
    if (!trunk || !canopy) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const colour = new THREE.Color()

    trees.forEach((tree, treeIndex) => {
      euler.set(0, tree.rotation, 0)
      quaternion.setFromEuler(euler)
      position.set(tree.x, tree.y + tree.height * 0.5, tree.z)
      scale.set(tree.girth, tree.height, tree.girth)
      matrix.compose(position, quaternion, scale)
      trunk.setMatrixAt(treeIndex, matrix)
      trunk.setColorAt(treeIndex, trunkColour)

      const clumps = [
        [-0.28, 0.66, 0.02, 0.95],
        [0.25, 0.72, 0.13, 0.82],
        [0.03, 0.86, -0.18, 0.78],
        [-0.03, 0.98, 0.02, 0.63],
        [0.08, 0.77, 0.31, 0.7],
      ] as const

      clumps.forEach(([ox, oy, oz, clumpScale], clumpIndex) => {
        const index = treeIndex * clumps.length + clumpIndex
        const spread = tree.canopy * tree.height * 0.26
        position.set(
          tree.x + ox * spread,
          tree.y + tree.height * oy,
          tree.z + oz * spread,
        )
        euler.set(
          (clumpIndex * 0.61 + tree.tint) * 0.13,
          tree.rotation + clumpIndex * 1.37,
          clumpIndex * 0.17,
        )
        quaternion.setFromEuler(euler)
        const radius = tree.canopy * clumpScale * (0.7 + tree.height * 0.14)
        scale.set(radius * 1.08, radius, radius * 0.92)
        matrix.compose(position, quaternion, scale)
        canopy.setMatrixAt(index, matrix)

        colour.copy(darkLeaf).lerp(lightLeaf, 0.18 + tree.tint * 0.68 + clumpIndex * 0.025)
        canopy.setColorAt(index, colour)
      })
    })

    trunk.instanceMatrix.needsUpdate = true
    canopy.instanceMatrix.needsUpdate = true
    if (trunk.instanceColor) trunk.instanceColor.needsUpdate = true
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
  }, [trees])

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
      <instancedMesh
        ref={canopyRef}
        args={[canopyGeometry, undefined, trees.length * 5]}
        castShadow
      >
        <meshStandardMaterial roughness={0.96} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={rockRef} args={[rockGeometry, undefined, rocks.length]} receiveShadow>
        <meshStandardMaterial roughness={1} metalness={0} />
      </instancedMesh>
    </group>
  )
}
