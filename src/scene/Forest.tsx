import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { generateForest, generateRocks, generateUnderstory } from '../lib/forest'
import { DetailedTrees } from './DetailedTrees'
import { Understory } from './Understory'

const darkRock = new THREE.Color('#2b322a')
const mossRock = new THREE.Color('#576b35')

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
  const rockRef = useRef<THREE.InstancedMesh>(null)
  const rockGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.5, 1), [])

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
      <DetailedTrees trees={trees} reducedMotion={reducedMotion} />
      <instancedMesh ref={rockRef} args={[rockGeometry, undefined, rocks.length]} receiveShadow castShadow>
        <meshStandardMaterial roughness={1} metalness={0} />
      </instancedMesh>
      <Understory plants={understory} reducedMotion={reducedMotion} />
    </group>
  )
}
