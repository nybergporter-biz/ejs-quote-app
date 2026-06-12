/* eslint-disable react/no-unknown-property */
// The Elite Junk Solutions trailer, modeled on Porter's real rig at true
// scale: 16ft × 6ft interior, 4ft plywood walls, cedar stake posts, black
// angle-iron frame, single axle, expanded-metal ramp gate. Quote items pack
// in as dimension-accurate sculpted models the way a real crew loads them.
// World units are FEET.
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { prefersReducedMotion } from '../lib/utils'
import { unitsForItems } from '../lib/trailerItems'
import { packTrailer } from '../lib/trailerPacking'
import { ItemModel } from './trailer/Models'

const INNER_L = 16 // ft, along z
const INNER_W = 6  // ft, along x
const WALL_H = 4   // ft
const HALF_L = INNER_L / 2
const HALF_W = INNER_W / 2

/* materials matched to the real trailer */
const MAT = {
  cedar: new THREE.MeshStandardMaterial({ color: '#8a4a27', roughness: 0.72 }),
  cap: new THREE.MeshStandardMaterial({ color: '#9c5026', roughness: 0.7 }),
  ply: new THREE.MeshStandardMaterial({ color: '#c79a5f', roughness: 0.82 }),
  plyIn: new THREE.MeshStandardMaterial({ color: '#b88e58', roughness: 0.85 }),
  deck: new THREE.MeshStandardMaterial({ color: '#a9854f', roughness: 0.88 }),
  plank: new THREE.MeshStandardMaterial({ color: '#6f522e', roughness: 0.85 }),
  steel: new THREE.MeshStandardMaterial({ color: '#1b1f25', metalness: 0.75, roughness: 0.45 }),
  mesh: new THREE.MeshStandardMaterial({ color: '#202329', metalness: 0.7, roughness: 0.5 }),
  hardware: new THREE.MeshStandardMaterial({ color: '#15171b', metalness: 0.8, roughness: 0.4 }),
  tire: new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.9 }),
  hub: new THREE.MeshStandardMaterial({ color: '#aab4bf', metalness: 0.95, roughness: 0.22 }),
}

/** Indoor-studio environment map, generated locally — works fully offline. */
function StudioEnvironment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = tex
    scene.environmentIntensity = 0.42
    return () => { scene.environment = null; tex.dispose(); pmrem.dispose() }
  }, [gl, scene])
  return null
}

function TrailerFrame() {
  const postZs = useMemo(() => {
    const arr = []
    const n = 8
    for (let i = 0; i <= n; i++) arr.push(-HALF_L + 0.6 + (i * (INNER_L - 1.2)) / n)
    return arr
  }, [])
  const crossZs = useMemo(() => {
    const arr = []
    for (let z = -HALF_L + 1; z <= HALF_L - 1; z += 2.2) arr.push(z)
    return arr
  }, [])
  const deckW = INNER_W + 0.5

  return (
    <group>
      {/* steel base frame */}
      {[-1, 1].map((s) => (
        <mesh key={`sb-${s}`} position={[s * (HALF_W + 0.15), -0.28, 0]} material={MAT.steel} castShadow>
          <boxGeometry args={[0.3, 0.45, INNER_L + 0.2]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`eb-${s}`} position={[0, -0.28, s * HALF_L]} material={MAT.steel} castShadow>
          <boxGeometry args={[deckW, 0.45, 0.3]} />
        </mesh>
      ))}
      {crossZs.map((z) => (
        <mesh key={`xm-${z}`} position={[0, -0.32, z]} material={MAT.steel}>
          <boxGeometry args={[INNER_W, 0.25, 0.2]} />
        </mesh>
      ))}

      {/* wood plank deck */}
      <mesh position={[0, -0.05, 0]} material={MAT.deck} receiveShadow>
        <boxGeometry args={[INNER_W, 0.12, INNER_L]} />
      </mesh>
      {Array.from({ length: 11 }).map((_, i) => (
        <mesh key={`plank-${i}`} position={[-HALF_W + 0.27 + i * ((INNER_W - 0.54) / 10), 0.011, 0]} material={MAT.plank}>
          <boxGeometry args={[0.035, 0.125, INNER_L - 0.15]} />
        </mesh>
      ))}

      {/* side walls: plywood + cedar posts + D-rings + cap rail */}
      {[-1, 1].map((side) => (
        <group key={`wall-${side}`}>
          <mesh position={[side * (HALF_W + 0.06), WALL_H / 2, 0]} material={MAT.ply} castShadow receiveShadow>
            <boxGeometry args={[0.12, WALL_H, INNER_L - 0.1]} />
          </mesh>
          <mesh position={[side * (HALF_W + 0.001), WALL_H / 2, 0]} material={MAT.plyIn}>
            <boxGeometry args={[0.01, WALL_H - 0.05, INNER_L - 0.15]} />
          </mesh>
          {postZs.map((z) => (
            <mesh key={`post-${side}-${z}`} position={[side * (HALF_W + 0.22), WALL_H / 2 - 0.08, z]} material={MAT.cedar} castShadow>
              <boxGeometry args={[0.22, WALL_H + 0.16, 0.28]} />
            </mesh>
          ))}
          {postZs.filter((_, i) => i % 2 === 0).map((z) => (
            <mesh key={`dring-${side}-${z}`} position={[side * (HALF_W + 0.36), WALL_H - 0.8, z]} rotation={[0, 0, Math.PI / 2]} material={MAT.hardware}>
              <torusGeometry args={[0.12, 0.03, 8, 16]} />
            </mesh>
          ))}
          <mesh position={[side * (HALF_W + 0.13), WALL_H + 0.1, 0]} material={MAT.cap} castShadow>
            <boxGeometry args={[0.45, 0.22, INNER_L + 0.1]} />
          </mesh>
        </group>
      ))}

      {/* front headboard */}
      <group>
        <mesh position={[0, WALL_H / 2, HALF_L + 0.06]} material={MAT.ply} castShadow>
          <boxGeometry args={[INNER_W - 0.1, WALL_H, 0.12]} />
        </mesh>
        {[-HALF_W + 0.2, 0, HALF_W - 0.2].map((x) => (
          <mesh key={`fpost-${x}`} position={[x, WALL_H / 2, HALF_L + 0.2]} material={MAT.cedar} castShadow>
            <boxGeometry args={[0.22, WALL_H + 0.16, 0.28]} />
          </mesh>
        ))}
        <mesh position={[0, WALL_H + 0.1, HALF_L + 0.1]} material={MAT.cap} castShadow>
          <boxGeometry args={[INNER_W + 0.4, 0.22, 0.45]} />
        </mesh>
      </group>

      <RearGate />

      {/* A-frame tongue + coupler + jack */}
      <group position={[0, -0.32, HALF_L]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.85, 0, 1.4]} rotation={[0, s * -0.3, 0]} material={MAT.steel} castShadow>
            <boxGeometry args={[0.25, 0.35, 3.6]} />
          </mesh>
        ))}
        <mesh position={[0, 0.05, 3.0]} material={MAT.hardware}>
          <boxGeometry args={[0.45, 0.4, 0.7]} />
        </mesh>
        <mesh position={[0, -0.5, 2.4]} material={MAT.steel}>
          <cylinderGeometry args={[0.09, 0.09, 0.9, 12]} />
        </mesh>
      </group>

      {/* single axle */}
      <Wheel position={[-(HALF_W + 0.55), -0.72, -0.4]} />
      <Wheel position={[HALF_W + 0.55, -0.72, -0.4]} />
      {[-1, 1].map((side) => (
        <mesh key={`fender-${side}`} position={[side * (HALF_W + 0.55), 0.18, -0.4]} material={MAT.steel} castShadow>
          <boxGeometry args={[0.95, 0.2, 3.1]} />
        </mesh>
      ))}

      {/* tail lights */}
      {[-1, 1].map((side) => (
        <mesh key={`tl-${side}`} position={[side * (HALF_W - 0.2), 0.12, -HALF_L - 0.05]}>
          <cylinderGeometry args={[0.13, 0.13, 0.1, 16]} />
          <meshStandardMaterial color="#7a1414" emissive="#c0392b" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function RearGate() {
  const z = -HALF_L - 0.06
  const w = INNER_W
  const h = WALL_H
  const vBars = []
  for (let x = -w / 2 + 0.35; x <= w / 2 - 0.35; x += 0.55) vBars.push(x)
  const hBars = []
  for (let y = 0.4; y <= h - 0.2; y += 0.62) hBars.push(y)
  return (
    <group position={[0, h / 2, z]}>
      {[-w / 2, w / 2].map((x, i) => (
        <mesh key={`gf-v${i}`} position={[x, 0, 0]} material={MAT.steel}>
          <boxGeometry args={[0.18, h, 0.2]} />
        </mesh>
      ))}
      {[h / 2, -h / 2].map((y, i) => (
        <mesh key={`gf-h${i}`} position={[0, y, 0]} material={MAT.steel}>
          <boxGeometry args={[w + 0.2, 0.18, 0.2]} />
        </mesh>
      ))}
      {vBars.map((x) => (
        <mesh key={`vb-${x}`} position={[x, 0, 0]} material={MAT.mesh}>
          <boxGeometry args={[0.05, h - 0.2, 0.06]} />
        </mesh>
      ))}
      {hBars.map((y) => (
        <mesh key={`hb-${y}`} position={[0, y - h / 2, 0]} material={MAT.mesh}>
          <boxGeometry args={[w - 0.2, 0.05, 0.06]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`latch-${s}`} position={[s * (w / 2 - 0.1), -h / 2 + 0.3, 0.14]} material={MAT.hardware}>
          <boxGeometry args={[0.14, 0.34, 0.14]} />
        </mesh>
      ))}
    </group>
  )
}

function Wheel({ position }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={MAT.tire} castShadow>
        <cylinderGeometry args={[1.15, 1.15, 0.7, 28]} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.15, 0.14, 12, 30]} />
        <meshStandardMaterial color="#0b0c0f" roughness={0.92} />
      </mesh>
      <mesh material={MAT.hub}>
        <cylinderGeometry args={[0.55, 0.55, 0.78, 24]} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32]} material={MAT.hub}>
            <cylinderGeometry args={[0.055, 0.055, 0.84, 8]} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ---------- one packed item, dropping into place ----------
   Models are built with their LENGTH along local X; the packer's rotY=0
   means "length runs along the trailer" (world Z), so the inner group yaws
   the model into trailer space. `flat` lays an edge item (mattress, drywall)
   down on top of the load: thin side up, length still along the trailer. */
function PackedItem({ placement, index, frozen }) {
  const { p, s } = useSpring({
    from: frozen
      ? { p: [placement.x, placement.y, placement.z], s: 1 }
      : { p: [placement.x, placement.y + 9, placement.z], s: 0.6 },
    to: { p: [placement.x, placement.y, placement.z], s: 1 },
    delay: frozen ? 0 : Math.min(index * 70, 1400),
    config: { mass: 1.1, tension: 280, friction: 26 },
  })
  return (
    <animated.group position={p} scale={s} rotation={[0, 0, placement.lean]}>
      {placement.flat ? (
        <group position={[placement.h / 2, placement.w / 2, 0]}>
          <group rotation={[0, Math.PI / 2, 0]}>
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <ItemModel unit={placement} />
            </group>
          </group>
        </group>
      ) : (
        <group rotation={[0, Math.PI / 2 - placement.rotY, 0]}>
          <ItemModel unit={placement} />
        </group>
      )}
    </animated.group>
  )
}

/* ---------- assembly with over-capacity shake + glow ---------- */
function Assembly({ placements, over, frozen }) {
  const group = useRef()
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.getElapsedTime()
    if (over && !frozen) {
      group.current.position.x = Math.sin(t * 42) * 0.04
      group.current.position.z = Math.cos(t * 38) * 0.04
      group.current.rotation.z = Math.sin(t * 40) * 0.01
    } else {
      group.current.position.x *= 0.85
      group.current.position.z *= 0.85
      group.current.rotation.z *= 0.85
    }
  })
  return (
    <group ref={group}>
      <TrailerFrame />
      {placements.map((pl, i) => (
        <PackedItem key={pl.key} placement={pl} index={i} frozen={frozen} />
      ))}
      {over && (
        <>
          <pointLight position={[0, 5, 0]} color="#ff3b30" intensity={120} distance={26} />
          <mesh position={[0, WALL_H / 2, 0]}>
            <boxGeometry args={[INNER_W + 1.2, WALL_H + 2, INNER_L + 1.2]} />
            <meshBasicMaterial color="#ff3b30" transparent opacity={0.05} side={THREE.BackSide} />
          </mesh>
        </>
      )}
    </group>
  )
}

export default function Trailer3D({ totalCY = 0, capacityCY = 12, items = [] }) {
  const over = totalCY > capacityCY
  const frozen = prefersReducedMotion()

  const placements = useMemo(
    () => packTrailer(unitsForItems(items), { L: INNER_L, W: INNER_W }),
    [items],
  )

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [12, 11.5, 14.5], fov: 38 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 0.95
      }}
      style={{ background: 'transparent' }}
    >
      <StudioEnvironment />

      {/* warm key light — late-afternoon sun */}
      <directionalLight
        position={[10, 16, 9]}
        intensity={1.7}
        color="#fff2dd"
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-far={50}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0004}
      />
      {/* cool sky fill + teal brand rim */}
      <directionalLight position={[-9, 7, -7]} intensity={0.55} color="#9fc4d8" />
      <pointLight position={[-8, 5, -6]} color={over ? '#ff5a4d' : '#3d9baa'} intensity={over ? 90 : 35} distance={36} />
      <hemisphereLight args={['#cfe2f0', '#10202f', 0.35]} />

      <Assembly placements={placements} over={over} frozen={frozen} />

      <ContactShadows position={[0, -1.92, 0]} opacity={0.55} scale={46} blur={2.6} far={12} resolution={512} frames={frozen ? 1 : undefined} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!frozen}
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI / 7}
        maxPolarAngle={Math.PI / 2.25}
        target={[0, 1.4, 0]}
      />
    </Canvas>
  )
}
