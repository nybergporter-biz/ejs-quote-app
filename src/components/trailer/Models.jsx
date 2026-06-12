/* eslint-disable react/no-unknown-property */
// Sculpted, dimension-accurate 3D models for every item in the library.
// Each builder fills its loaded bounding box (l × w × h, in feet) with the
// bottom at y=0 — placement/rotation happens in the parent. Materials are
// shared module-level PBR instances so 60+ items stay cheap on a phone.
import * as THREE from 'three'
import { useMemo } from 'react'

const std = (p) => new THREE.MeshStandardMaterial(p)
const phys = (p) => new THREE.MeshPhysicalMaterial(p)

export const MATS = {
  fabrics: [
    std({ color: '#5b6678', roughness: 0.94 }),
    std({ color: '#7a6a55', roughness: 0.94 }),
    std({ color: '#4a5a52', roughness: 0.94 }),
    std({ color: '#6e5a63', roughness: 0.94 }),
  ],
  fabricDark: std({ color: '#3a4250', roughness: 0.95 }),
  leather: phys({ color: '#5e3f2c', roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.6 }),
  woods: [
    std({ color: '#8a6440', roughness: 0.72 }),
    std({ color: '#6e4f33', roughness: 0.74 }),
    std({ color: '#a3815c', roughness: 0.7 }),
    std({ color: '#4e3a28', roughness: 0.76 }),
  ],
  woodPale: std({ color: '#c2a378', roughness: 0.78 }),
  whiteEnamel: phys({ color: '#e9ecef', roughness: 0.25, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  steelBrushed: std({ color: '#aab4bd', metalness: 0.85, roughness: 0.35 }),
  steelDark: std({ color: '#3a4148', metalness: 0.8, roughness: 0.45 }),
  blackPlastic: std({ color: '#1d2126', roughness: 0.55 }),
  greyPlastic: std({ color: '#7d858d', roughness: 0.6 }),
  screen: phys({ color: '#0a0d12', metalness: 0.4, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 }),
  mattressTick: std({ color: '#e8e4da', roughness: 0.92 }),
  mattressBand: std({ color: '#c8c2b4', roughness: 0.9 }),
  rubber: std({ color: '#181a1c', roughness: 0.92 }),
  chrome: std({ color: '#cfd6dc', metalness: 0.95, roughness: 0.18 }),
  cardboard: std({ color: '#b08d57', roughness: 0.88 }),
  cardboardTape: std({ color: '#8d6e3f', roughness: 0.8 }),
  bagBlack: phys({ color: '#15171a', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.5 }),
  tarpBlue: std({ color: '#2d5a7a', roughness: 0.8 }),
  tarpGreen: std({ color: '#3d5a45', roughness: 0.8 }),
  concrete: std({ color: '#8d8d86', roughness: 0.95 }),
  drywall: std({ color: '#dfdcd4', roughness: 0.9 }),
  pianoBlack: phys({ color: '#0e0e10', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06 }),
  ivory: std({ color: '#f2efe6', roughness: 0.4 }),
  redEnamel: phys({ color: '#a83232', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  greenEnamel: phys({ color: '#3f6b3a', roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  hotTubShell: phys({ color: '#b8bfc6', roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
  hotTubSkirt: std({ color: '#5a4636', roughness: 0.8 }),
}

const seeded = (n, salt = 0) => {
  const x = Math.sin((n + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}
const pick = (arr, seed) => arr[Math.floor(seeded(seed, 9) * arr.length) % arr.length]

/** Box mesh shorthand: size [x,y,z], pos is the CENTER. */
const B = ({ s, p = [0, 0, 0], m, r }) => (
  <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
    <boxGeometry args={s} />
  </mesh>
)
const Cyl = ({ rTop, rBot, h, p = [0, 0, 0], m, r, seg = 20 }) => (
  <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
    <cylinderGeometry args={[rTop, rBot ?? rTop, h, seg]} />
  </mesh>
)

/* ================= FURNITURE ================= */

function Sofa({ l, w, h, seed }) {
  const fab = pick(MATS.fabrics, seed)
  const armW = Math.min(0.55, l * 0.12)
  const seatTop = h * 0.42
  const innerL = l - armW * 2
  const cushions = Math.max(1, Math.round(innerL / 2.1))
  const cw = innerL / cushions - 0.05
  return (
    <group>
      <B s={[l, seatTop * 0.55, w]} p={[0, seatTop * 0.45, 0]} m={fab} />
      {/* back */}
      <B s={[l, h - seatTop, w * 0.28]} p={[0, seatTop + (h - seatTop) / 2, -w / 2 + w * 0.14]} m={fab} />
      {/* arms */}
      {[-1, 1].map((s) => (
        <B key={s} s={[armW, h * 0.72, w * 0.92]} p={[s * (l / 2 - armW / 2), h * 0.36, 0]} m={fab} />
      ))}
      {/* seat + back cushions */}
      {Array.from({ length: cushions }).map((_, i) => {
        const x = -innerL / 2 + cw / 2 + i * (cw + 0.05)
        return (
          <group key={i}>
            <B s={[cw, 0.42, w * 0.6]} p={[x, seatTop + 0.21, w * 0.06]} m={fab} />
            <B s={[cw, h - seatTop - 0.18, 0.45]} p={[x, seatTop + (h - seatTop) / 2 + 0.06, -w / 2 + w * 0.28 + 0.18]} r={[-0.12, 0, 0]} m={fab} />
          </group>
        )
      })}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} rTop={0.07} h={0.25} p={[sx * (l / 2 - 0.3), 0.12, sz * (w / 2 - 0.3)]} m={MATS.woods[3]} seg={10} />
      ))}
    </group>
  )
}

function Recliner({ l, w, h, seed }) {
  const fab = seeded(seed, 2) > 0.5 ? MATS.leather : pick(MATS.fabrics, seed)
  return (
    <group>
      <B s={[l, h * 0.34, w]} p={[0, h * 0.24, 0]} m={fab} />
      <B s={[l * 0.96, h * 0.6, w * 0.34]} p={[0, h * 0.55, -w / 2 + w * 0.18]} r={[-0.18, 0, 0]} m={fab} />
      {[-1, 1].map((s) => (
        <B key={s} s={[l * 0.2, h * 0.5, w * 0.9]} p={[s * (l / 2 - l * 0.1), h * 0.3, 0]} m={fab} />
      ))}
      <B s={[l * 0.55, 0.32, w * 0.5]} p={[0, h * 0.42, w * 0.12]} m={fab} />
    </group>
  )
}

function Table({ l, w, h, seed }) {
  const wood = pick(MATS.woods, seed)
  return (
    <group>
      <B s={[l, 0.16, w]} p={[0, h - 0.08, 0]} m={wood} />
      <B s={[l * 0.9, 0.1, w * 0.85]} p={[0, h - 0.2, 0]} m={wood} />
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <B key={i} s={[0.16, h - 0.16, 0.16]} p={[sx * (l / 2 - 0.2), (h - 0.16) / 2, sz * (w / 2 - 0.18)]} m={wood} />
      ))}
    </group>
  )
}

function Chair({ l, w, h, seed }) {
  const wood = pick(MATS.woods, seed)
  const seatH = h * 0.48
  return (
    <group>
      <B s={[l, 0.12, w * 0.85]} p={[0, seatH, w * 0.05]} m={wood} />
      <B s={[l * 0.92, h - seatH, 0.12]} p={[0, seatH + (h - seatH) / 2, -w / 2 + 0.1]} r={[-0.08, 0, 0]} m={wood} />
      {[0.3, 0.62].map((f, i) => (
        <B key={i} s={[l * 0.84, 0.09, 0.06]} p={[0, seatH + (h - seatH) * f, -w / 2 + 0.13]} r={[-0.08, 0, 0]} m={wood} />
      ))}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <B key={i} s={[0.1, seatH, 0.1]} p={[sx * (l / 2 - 0.1), seatH / 2, sz * (w / 2 - 0.12)]} m={wood} />
      ))}
    </group>
  )
}

function Dresser({ l, w, h, seed }) {
  const wood = pick(MATS.woods, seed)
  const rows = h > 2.4 ? 4 : 3
  const dh = (h - 0.3) / rows
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={wood} />
      {Array.from({ length: rows }).map((_, i) => (
        <group key={i}>
          <B s={[l - 0.18, dh - 0.1, 0.05]} p={[0, 0.2 + dh * i + dh / 2, w / 2 + 0.01]} m={MATS.woods[(seed + 1) % 4]} />
          <B s={[Math.min(1.1, l * 0.4), 0.07, 0.07]} p={[0, 0.2 + dh * i + dh / 2, w / 2 + 0.06]} m={MATS.steelBrushed} />
        </group>
      ))}
    </group>
  )
}

function Bookshelf({ l, w, h, seed }) {
  const wood = pick(MATS.woods, seed)
  const shelves = Math.max(3, Math.round(h / 1.3))
  return (
    <group>
      {[-1, 1].map((s) => <B key={s} s={[0.1, h, w]} p={[s * (l / 2 - 0.05), h / 2, 0]} m={wood} />)}
      <B s={[l, 0.1, w]} p={[0, h - 0.05, 0]} m={wood} />
      <B s={[l, h, 0.06]} p={[0, h / 2, -w / 2 + 0.03]} m={wood} />
      {Array.from({ length: shelves }).map((_, i) => (
        <B key={i} s={[l - 0.2, 0.08, w - 0.06]} p={[0, (h / shelves) * i + 0.1, 0.02]} m={wood} />
      ))}
    </group>
  )
}

function Desk({ l, w, h, seed }) {
  const wood = pick(MATS.woods, seed)
  return (
    <group>
      <B s={[l, 0.14, w]} p={[0, h - 0.07, 0]} m={wood} />
      <B s={[l * 0.3, h - 0.14, w * 0.9]} p={[-l / 2 + l * 0.15, (h - 0.14) / 2, 0]} m={wood} />
      {Array.from({ length: 3 }).map((_, i) => (
        <B key={i} s={[l * 0.26, (h - 0.4) / 3 - 0.06, 0.04]} p={[-l / 2 + l * 0.15, 0.25 + ((h - 0.4) / 3) * i + (h - 0.4) / 6, w / 2 - 0.04]} m={MATS.woods[(seed + 2) % 4]} />
      ))}
      {[-1, 1].map((s) => (
        <B key={s} s={[0.12, h - 0.14, 0.12]} p={[l / 2 - 0.15, (h - 0.14) / 2, s * (w / 2 - 0.15)]} m={wood} />
      ))}
    </group>
  )
}

function BedFrame({ l, w, h, seed }) {
  // disassembled: headboard + footboard + rails leaning as a stack
  const wood = pick(MATS.woods, seed)
  return (
    <group>
      <B s={[l, h, w * 0.32]} p={[0, h / 2, -w / 2 + w * 0.16]} m={wood} />
      <B s={[l * 0.96, h * 0.62, w * 0.26]} p={[0, h * 0.31, -w / 2 + w * 0.45]} r={[0.04, 0, 0]} m={MATS.woods[(seed + 1) % 4]} />
      <B s={[l * 0.92, h * 0.2, w * 0.3]} p={[0, h * 0.12, w / 2 - w * 0.2]} r={[0.06, 0, 0.01]} m={wood} />
      <B s={[l * 0.9, h * 0.14, w * 0.22]} p={[0, h * 0.28, w / 2 - w * 0.25]} r={[0.05, 0, -0.015]} m={wood} />
    </group>
  )
}

function Wardrobe({ l, w, h, seed }) {
  const wood = pick(MATS.woods, seed)
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={wood} />
      {[-1, 1].map((s) => (
        <B key={s} s={[l / 2 - 0.12, h - 0.25, 0.05]} p={[s * (l / 4), h / 2, w / 2 + 0.01]} m={MATS.woods[(seed + 1) % 4]} />
      ))}
      {[-1, 1].map((s) => (
        <Cyl key={s} rTop={0.04} h={0.6} p={[s * 0.14, h * 0.5, w / 2 + 0.07]} m={MATS.steelBrushed} seg={10} />
      ))}
      <B s={[l, 0.18, w + 0.08]} p={[0, h - 0.09, 0]} m={wood} />
    </group>
  )
}

function Filing({ l, w, h }) {
  const drawers = 4
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.steelDark} />
      {Array.from({ length: drawers }).map((_, i) => (
        <group key={i}>
          <B s={[l - 0.1, h / drawers - 0.08, 0.04]} p={[0, (h / drawers) * i + h / drawers / 2, w / 2 + 0.01]} m={MATS.greyPlastic} />
          <B s={[l * 0.5, 0.05, 0.06]} p={[0, (h / drawers) * i + h / drawers / 2 + 0.08, w / 2 + 0.05]} m={MATS.steelBrushed} />
        </group>
      ))}
    </group>
  )
}

function OfficeChair({ l, w, h }) {
  return (
    <group>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2
        return <B key={i} s={[0.08, 0.07, w * 0.45]} p={[Math.sin(a) * w * 0.22, 0.1, Math.cos(a) * w * 0.22]} r={[0, a, 0]} m={MATS.blackPlastic} />
      })}
      <Cyl rTop={0.06} h={h * 0.34} p={[0, h * 0.22, 0]} m={MATS.chrome} seg={12} />
      <B s={[l * 0.9, 0.18, w * 0.82]} p={[0, h * 0.42, 0.05]} m={MATS.fabricDark} />
      <B s={[l * 0.82, h * 0.5, 0.22]} p={[0, h * 0.68, -w / 2 + 0.25]} r={[-0.1, 0, 0]} m={MATS.fabricDark} />
      {[-1, 1].map((s) => (
        <B key={s} s={[0.12, 0.3, w * 0.5]} p={[s * (l / 2 - 0.15), h * 0.52, 0.02]} m={MATS.blackPlastic} />
      ))}
    </group>
  )
}

function TVStand({ l, w, h, seed }) {
  const wood = pick(MATS.woods, seed)
  return (
    <group>
      <B s={[l, 0.12, w]} p={[0, h - 0.06, 0]} m={wood} />
      <B s={[l, 0.12, w]} p={[0, 0.18, 0]} m={wood} />
      {[-1, 0, 1].map((s) => <B key={s} s={[0.1, h - 0.3, w - 0.05]} p={[s * (l / 2 - 0.1), h / 2, 0]} m={wood} />)}
      <B s={[l / 2 - 0.2, h - 0.45, 0.04]} p={[l / 4, h / 2, w / 2]} m={MATS.woods[(seed + 1) % 4]} />
    </group>
  )
}

/* ================= MATTRESSES ================= */

function Mattress({ l, w, h, seed }) {
  // standing on edge: thin (w) and tall (h), slightly slumped
  return (
    <group>
      <mesh position={[0, h / 2, 0]} material={MATS.mattressTick} castShadow receiveShadow>
        <boxGeometry args={[l, h, w * 0.8]} />
      </mesh>
      <B s={[l + 0.02, 0.35, w * 0.84]} p={[0, h * 0.5, 0]} m={MATS.mattressBand} />
      {/* quilt buttons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Cyl key={i} rTop={0.05} h={0.03} seg={8}
          p={[-l / 2 + 0.7 + (i % 4) * (l / 4.2), h * 0.32 + Math.floor(i / 4) * h * 0.36, w * 0.41]}
          r={[Math.PI / 2, 0, 0]} m={MATS.mattressBand} />
      ))}
      <group rotation={[0, 0, seeded(seed, 3) * 0.02 - 0.01]} />
    </group>
  )
}

function BoxSpring({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w * 0.85]} p={[0, h / 2, 0]} m={MATS.mattressBand} />
      <B s={[l, h * 0.16, w * 0.88]} p={[0, h * 0.08, 0]} m={MATS.woodPale} />
    </group>
  )
}

/* ================= APPLIANCES ================= */

function Fridge({ l, w, h, seed }) {
  const body = seeded(seed, 5) > 0.5 ? MATS.steelBrushed : MATS.whiteEnamel
  const split = h * 0.62
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={body} />
      <B s={[l - 0.06, h - split - 0.06, 0.05]} p={[0, split + (h - split) / 2, w / 2 + 0.01]} m={body} />
      <B s={[l - 0.06, split - 0.1, 0.05]} p={[0, split / 2, w / 2 + 0.01]} m={body} />
      <B s={[0.08, (h - split) * 0.7, 0.08]} p={[-l / 2 + 0.18, split + (h - split) / 2, w / 2 + 0.08]} m={MATS.steelDark} />
      <B s={[0.08, split * 0.6, 0.08]} p={[-l / 2 + 0.18, split / 2, w / 2 + 0.08]} m={MATS.steelDark} />
    </group>
  )
}

function ChestFreezer({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.whiteEnamel} />
      <B s={[l + 0.04, 0.14, w + 0.04]} p={[0, h - 0.07, 0]} m={MATS.whiteEnamel} />
      <B s={[l * 0.4, 0.06, 0.1]} p={[0, h - 0.18, w / 2 + 0.04]} m={MATS.greyPlastic} />
    </group>
  )
}

function Washer({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.whiteEnamel} />
      <mesh position={[0, h * 0.48, w / 2 + 0.02]} material={MATS.steelDark} castShadow>
        <torusGeometry args={[Math.min(l, h) * 0.3, 0.06, 12, 28]} />
      </mesh>
      <mesh position={[0, h * 0.48, w / 2 + 0.03]} material={MATS.screen}>
        <circleGeometry args={[Math.min(l, h) * 0.27, 24]} />
      </mesh>
      <B s={[l, 0.22, w]} p={[0, h - 0.11, 0]} m={MATS.whiteEnamel} />
      <B s={[l * 0.3, 0.1, 0.04]} p={[-l / 2 + l * 0.22, h - 0.11, w / 2 + 0.01]} m={MATS.screen} />
    </group>
  )
}

function Dryer({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.whiteEnamel} />
      <Cyl rTop={Math.min(l, h) * 0.32} h={0.04} p={[0, h * 0.45, w / 2 + 0.01]} r={[Math.PI / 2, 0, 0]} m={MATS.greyPlastic} seg={26} />
      <Cyl rTop={0.1} h={0.06} p={[l / 2 - 0.3, h - 0.16, w / 2 + 0.01]} r={[Math.PI / 2, 0, 0]} m={MATS.blackPlastic} seg={14} />
    </group>
  )
}

function Stove({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.whiteEnamel} />
      <B s={[l, 0.05, w]} p={[0, h - 0.02, 0]} m={MATS.screen} />
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} rTop={0.28} h={0.02} p={[sx * l * 0.24, h + 0.01, sz * w * 0.22]} m={MATS.blackPlastic} seg={20} />
      ))}
      <B s={[l - 0.2, h * 0.4, 0.04]} p={[0, h * 0.35, w / 2 + 0.01]} m={MATS.screen} />
      <B s={[l - 0.3, 0.05, 0.08]} p={[0, h * 0.6, w / 2 + 0.05]} m={MATS.steelBrushed} />
    </group>
  )
}

function Dishwasher({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.steelBrushed} />
      <B s={[l - 0.08, h * 0.7, 0.04]} p={[0, h * 0.42, w / 2 + 0.01]} m={MATS.steelBrushed} />
      <B s={[l - 0.2, 0.06, 0.08]} p={[0, h * 0.82, w / 2 + 0.04]} m={MATS.steelDark} />
    </group>
  )
}

function Microwave({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.blackPlastic} />
      <B s={[l * 0.66, h * 0.74, 0.03]} p={[-l * 0.12, h / 2, w / 2 + 0.01]} m={MATS.screen} />
      <B s={[l * 0.22, h * 0.74, 0.02]} p={[l * 0.36, h / 2, w / 2 + 0.01]} m={MATS.greyPlastic} />
    </group>
  )
}

function WaterHeater({ l, h }) {
  return (
    <group>
      <Cyl rTop={l / 2} h={h * 0.92} p={[0, h * 0.48, 0]} m={MATS.whiteEnamel} seg={24} />
      <Cyl rTop={l / 2 - 0.05} h={0.1} p={[0, h * 0.96, 0]} m={MATS.greyPlastic} seg={24} />
      <Cyl rTop={0.05} h={0.4} p={[l * 0.2, h, 0]} m={MATS.steelBrushed} seg={10} />
    </group>
  )
}

function ACUnit({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.greyPlastic} />
      {Array.from({ length: 6 }).map((_, i) => (
        <B key={i} s={[l - 0.1, 0.04, 0.02]} p={[0, h * 0.25 + i * h * 0.1, w / 2 + 0.01]} m={MATS.blackPlastic} />
      ))}
    </group>
  )
}

function ACPortable({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.whiteEnamel} />
      {Array.from({ length: 5 }).map((_, i) => (
        <B key={i} s={[l - 0.16, 0.05, 0.02]} p={[0, h * 0.62 + i * h * 0.06, w / 2 + 0.01]} m={MATS.greyPlastic} />
      ))}
      <Cyl rTop={0.22} h={0.5} p={[0, h * 0.8, -w / 2 - 0.1]} r={[Math.PI / 3, 0, 0]} m={MATS.greyPlastic} seg={14} />
    </group>
  )
}

/* ================= ELECTRONICS ================= */

function TV({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, 0.12]} p={[0, h / 2 + 0.1, 0]} m={MATS.screen} />
      <B s={[l, h, 0.05]} p={[0, h / 2 + 0.1, -0.08]} m={MATS.blackPlastic} />
      <B s={[l * 0.4, 0.1, w]} p={[0, 0.05, 0]} m={MATS.blackPlastic} />
    </group>
  )
}

function Monitor({ l, w, h }) {
  return (
    <group>
      <B s={[l, h * 0.72, 0.08]} p={[0, h * 0.6, 0]} m={MATS.screen} />
      <Cyl rTop={0.05} h={h * 0.3} p={[0, h * 0.18, -0.05]} m={MATS.blackPlastic} seg={10} />
      <Cyl rTop={l * 0.22} h={0.05} p={[0, 0.03, 0]} m={MATS.blackPlastic} seg={18} />
    </group>
  )
}

function Tower({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.blackPlastic} />
      <B s={[l - 0.06, h - 0.1, 0.02]} p={[0, h / 2, w / 2 + 0.01]} m={MATS.screen} />
      <Cyl rTop={0.06} h={0.02} p={[0, h * 0.8, w / 2 + 0.03]} r={[Math.PI / 2, 0, 0]} m={MATS.chrome} seg={10} />
    </group>
  )
}

function Printer({ l, w, h }) {
  return (
    <group>
      <B s={[l, h * 0.7, w]} p={[0, h * 0.35, 0]} m={MATS.greyPlastic} />
      <B s={[l * 0.7, h * 0.25, w * 0.6]} p={[0, h * 0.8, 0]} m={MATS.blackPlastic} />
      <B s={[l * 0.5, 0.03, w * 0.4]} p={[0, h * 0.72, w * 0.35]} r={[0.3, 0, 0]} m={MATS.drywall} />
    </group>
  )
}

/* ================= OUTDOOR ================= */

function PushMower({ l, w, h }) {
  return (
    <group>
      <B s={[l * 0.45, 0.35, w]} p={[-l * 0.22, 0.35, 0]} m={MATS.redEnamel} />
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} rTop={0.16} h={0.1} p={[-l * 0.22 + sx * l * 0.16, 0.16, sz * (w / 2 - 0.05)]} r={[Math.PI / 2, 0, 0]} m={MATS.rubber} seg={14} />
      ))}
      {[-1, 1].map((s) => (
        <Cyl key={s} rTop={0.035} h={l * 0.75} p={[l * 0.12, h * 0.55, s * w * 0.3]} r={[0, 0, -0.9]} m={MATS.steelDark} seg={8} />
      ))}
      <Cyl rTop={0.04} h={w * 0.62} p={[l * 0.4, h * 0.92, 0]} r={[Math.PI / 2, 0, 0]} m={MATS.blackPlastic} seg={8} />
    </group>
  )
}

function RidingMower({ l, w, h }) {
  return (
    <group>
      <B s={[l * 0.86, 0.45, w * 0.8]} p={[0, 0.55, 0]} m={MATS.greenEnamel} />
      <B s={[l * 0.34, 0.5, w * 0.7]} p={[l * 0.26, 0.95, 0]} m={MATS.greenEnamel} />
      <B s={[l * 0.26, 0.4, w * 0.5]} p={[-l * 0.18, 1.05, 0]} m={MATS.fabricDark} />
      <B s={[l * 0.08, 0.6, w * 0.46]} p={[-l * 0.3, 1.35, 0]} m={MATS.fabricDark} />
      <Cyl rTop={0.2} h={0.4} p={[-l * 0.05, h * 0.46, 0]} r={[0.5, 0, 0]} m={MATS.blackPlastic} seg={14} />
      {[-1, 1].map((s) => <Cyl key={`r${s}`} rTop={0.55} h={0.34} p={[-l * 0.28, 0.55, s * (w / 2 - 0.18)]} r={[Math.PI / 2, 0, 0]} m={MATS.rubber} seg={18} />)}
      {[-1, 1].map((s) => <Cyl key={`f${s}`} rTop={0.34} h={0.26} p={[l * 0.3, 0.34, s * (w / 2 - 0.2)]} r={[Math.PI / 2, 0, 0]} m={MATS.rubber} seg={16} />)}
    </group>
  )
}

function Bicycle({ l, h }) {
  const R = h * 0.34
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * l * 0.27, R, 0]} material={MATS.rubber} castShadow>
          <torusGeometry args={[R, 0.045, 10, 28]} />
        </mesh>
      ))}
      <Cyl rTop={0.035} h={l * 0.5} p={[0, R + h * 0.18, 0]} r={[0, 0, 1.25]} m={MATS.redEnamel} seg={8} />
      <Cyl rTop={0.035} h={l * 0.42} p={[-l * 0.1, R + h * 0.1, 0]} r={[0, 0, -1.1]} m={MATS.redEnamel} seg={8} />
      <Cyl rTop={0.035} h={h * 0.5} p={[l * 0.27, R + h * 0.22, 0]} r={[0, 0, 0.25]} m={MATS.redEnamel} seg={8} />
      <Cyl rTop={0.03} h={0.5} p={[l * 0.3, h * 0.92, 0]} r={[Math.PI / 2, 0, 0]} m={MATS.steelDark} seg={8} />
      <B s={[0.35, 0.07, 0.12]} p={[-l * 0.18, h * 0.86, 0]} m={MATS.blackPlastic} />
    </group>
  )
}

function Tire({ l, h, rim }) {
  const R = l / 2
  return (
    <group>
      <mesh position={[0, h / 2, 0]} rotation={[Math.PI / 2, 0, 0]} material={MATS.rubber} castShadow receiveShadow>
        <torusGeometry args={[R * 0.7, R * 0.3, 14, 30]} />
      </mesh>
      {rim && <Cyl rTop={R * 0.45} h={h * 0.5} p={[0, h / 2, 0]} m={MATS.steelBrushed} seg={20} />}
    </group>
  )
}

function Grill({ l, w, h }) {
  return (
    <group>
      <Cyl rTop={w * 0.5} h={w * 0.55} p={[-l * 0.12, h * 0.62, 0]} m={MATS.blackPlastic} seg={22} />
      <mesh position={[-l * 0.12, h * 0.62 + w * 0.28, 0]} material={MATS.blackPlastic} castShadow>
        <sphereGeometry args={[w * 0.5, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <B s={[l * 0.4, 0.06, w * 0.7]} p={[l * 0.28, h * 0.6, 0]} m={MATS.woodPale} />
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} rTop={0.04} h={h * 0.6} p={[-l * 0.12 + sx * w * 0.3, h * 0.3, sz * w * 0.3]} m={MATS.steelDark} seg={8} />
      ))}
      {[-1, 1].map((s) => <Cyl key={s} rTop={0.12} h={0.06} p={[-l * 0.12 + s * w * 0.32, 0.12, w * 0.3]} r={[Math.PI / 2, 0, 0]} m={MATS.rubber} seg={12} />)}
    </group>
  )
}

function PatioChair({ l, w, h }) {
  return (
    <group>
      <B s={[l, 0.08, w * 0.8]} p={[0, h * 0.42, w * 0.05]} m={MATS.greyPlastic} />
      <B s={[l * 0.94, h * 0.55, 0.08]} p={[0, h * 0.66, -w / 2 + 0.12]} r={[-0.2, 0, 0]} m={MATS.greyPlastic} />
      {[-1, 1].map((s) => <B key={s} s={[0.07, h * 0.42, w * 0.85]} p={[s * (l / 2 - 0.05), h * 0.21, 0]} m={MATS.greyPlastic} />)}
      {[-1, 1].map((s) => <B key={s} s={[l * 0.9, 0.06, 0.07]} p={[0, h * 0.5, s === -1 ? w / 2 - 0.1 : -w / 2 + 0.3]} m={MATS.greyPlastic} />)}
    </group>
  )
}

function PatioTable({ l, w, h }) {
  return (
    <group>
      <Cyl rTop={Math.min(l, w) / 2} h={0.06} p={[0, h - 0.03, 0]} m={MATS.screen} seg={28} />
      <Cyl rTop={0.06} h={h - 0.1} p={[0, (h - 0.1) / 2, 0]} m={MATS.steelDark} seg={12} />
      <Cyl rTop={Math.min(l, w) * 0.25} h={0.05} p={[0, 0.03, 0]} m={MATS.steelDark} seg={18} />
    </group>
  )
}

function HotTub({ l, w, h }) {
  // riding on edge: shell facing out, wood skirt visible
  return (
    <group>
      <B s={[l, h, w * 0.85]} p={[0, h / 2, 0]} m={MATS.hotTubSkirt} />
      <B s={[l - 0.3, h - 0.3, 0.12]} p={[0, h / 2, w * 0.38]} m={MATS.hotTubShell} />
      <mesh position={[0, h / 2, w * 0.45]} material={MATS.hotTubShell} castShadow>
        <boxGeometry args={[l - 0.9, h - 0.9, 0.1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <B key={s} s={[l - 0.5, 0.3, 0.06]} p={[0, h / 2 + s * (h / 2 - 0.5), w * 0.44]} m={MATS.hotTubShell} />
      ))}
    </group>
  )
}

function Trampoline({ l, w, h }) {
  // disassembled: folded mat + rail bundle + leg pile
  return (
    <group>
      <B s={[l, h * 0.4, w * 0.85]} p={[0, h * 0.2, 0]} m={MATS.fabricDark} />
      <B s={[l * 0.92, h * 0.22, w * 0.6]} p={[0, h * 0.5, -w * 0.08]} r={[0, 0.04, 0]} m={MATS.fabricDark} />
      {Array.from({ length: 4 }).map((_, i) => (
        <Cyl key={i} rTop={0.05} h={l * 0.85} p={[0, h * 0.68 + i * 0.07, -w * 0.2 + i * w * 0.12]} r={[0, 0, Math.PI / 2]} m={MATS.steelBrushed} seg={8} />
      ))}
    </group>
  )
}

function PanelStack({ l, w, h, seed }) {
  const layers = 4
  return (
    <group>
      {Array.from({ length: layers }).map((_, i) => (
        <B key={i} s={[l - i * 0.2, h / layers - 0.03, w - seeded(i, seed) * 0.4]}
          p={[(seeded(i, 2) - 0.5) * 0.15, (h / layers) * i + h / layers / 2, (seeded(i, 3) - 0.5) * 0.2]}
          r={[0, (seeded(i, 4) - 0.5) * 0.04, 0]} m={MATS.woods[i % 4]} />
      ))}
    </group>
  )
}

/* ================= CONSTRUCTION ================= */

function Drywall({ l, w, h }) {
  const sheets = 6
  return (
    <group>
      {Array.from({ length: sheets }).map((_, i) => (
        <B key={i} s={[l, h - i * 0.04, 0.045]} p={[0, (h - i * 0.04) / 2, -w / 2 + 0.05 + i * (w - 0.1) / sheets]} r={[0, 0, 0]} m={MATS.drywall} />
      ))}
    </group>
  )
}

function Lumber({ l, w, h, seed }) {
  const rows = 3, cols = 4
  return (
    <group>
      {Array.from({ length: rows * cols }).map((_, i) => {
        const r = Math.floor(i / cols), c = i % cols
        return (
          <B key={i} s={[l - seeded(i, seed) * 1.2, h / rows - 0.04, w / cols - 0.06]}
            p={[(seeded(i, 5) - 0.5) * 0.4, (h / rows) * r + h / rows / 2, -w / 2 + (w / cols) * c + w / cols / 2]}
            m={MATS.woods[i % 4]} />
        )
      })}
    </group>
  )
}

function CarpetRoll({ l, w, h, seed }) {
  return (
    <group>
      <Cyl rTop={Math.min(w, h) / 2} h={l} p={[0, Math.min(w, h) / 2, 0]} r={[0, 0, Math.PI / 2]} m={pick(MATS.fabrics, seed)} seg={20} />
      <Cyl rTop={Math.min(w, h) * 0.12} h={l + 0.2} p={[0, Math.min(w, h) / 2, 0]} r={[0, 0, Math.PI / 2]} m={MATS.cardboard} seg={10} />
    </group>
  )
}

function Rubble({ l, w, h, seed }) {
  return (
    <group>
      {Array.from({ length: 9 }).map((_, i) => {
        const s = 0.35 + seeded(i, seed) * 0.5
        return (
          <mesh key={i} castShadow receiveShadow material={MATS.concrete}
            position={[(seeded(i, 1) - 0.5) * (l - s), s / 2 + seeded(i, 2) * (h - s) * 0.5, (seeded(i, 3) - 0.5) * (w - s)]}
            rotation={[seeded(i, 4) * 0.8, seeded(i, 5) * 2, seeded(i, 6) * 0.8]}>
            <dodecahedronGeometry args={[s / 1.6, 0]} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ================= MISC ================= */

function PianoUpright({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w * 0.8]} p={[0, h / 2, -w * 0.1]} m={MATS.pianoBlack} />
      <B s={[l, 0.14, w]} p={[0, h * 0.62, 0]} m={MATS.pianoBlack} />
      <B s={[l - 0.4, 0.06, w * 0.3]} p={[0, h * 0.64, w * 0.28]} m={MATS.ivory} />
      {Array.from({ length: 10 }).map((_, i) => (
        <B key={i} s={[0.045, 0.04, w * 0.18]} p={[-l / 2 + 0.45 + i * ((l - 0.9) / 9), h * 0.665, w * 0.25]} m={MATS.pianoBlack} />
      ))}
      {[-1, 1].map((s) => <B key={s} s={[0.18, h * 0.6, 0.18]} p={[s * (l / 2 - 0.15), h * 0.3, w * 0.3]} m={MATS.pianoBlack} />)}
      {[-1, 1].map((s) => <Cyl key={s} rTop={0.09} h={0.05} p={[s * (l / 2 - 0.2), 0.04, w * 0.3]} r={[Math.PI / 2, 0, 0]} m={MATS.steelBrushed} seg={12} />)}
    </group>
  )
}

function PianoGrand({ l, w, h }) {
  // on a moving skid, on its side — the curved body silhouette faces out
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-l / 2, -h / 2 + 0.4)
    s.lineTo(-l / 2, h / 2 - 0.6)
    s.bezierCurveTo(-l * 0.1, h / 2, l * 0.15, h / 2 - 0.2, l * 0.32, h * 0.1)
    s.bezierCurveTo(l * 0.48, -h * 0.15, l / 2, -h * 0.2, l / 2, -h / 2 + 0.4)
    s.lineTo(-l / 2, -h / 2 + 0.4)
    return s
  }, [l, h])
  return (
    <group>
      <B s={[l, 0.35, w]} p={[0, 0.18, 0]} m={MATS.woods[3]} />
      <mesh position={[0, h / 2 + 0.2, 0]} material={MATS.pianoBlack} castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth: w * 0.7, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04 }]} />
      </mesh>
    </group>
  )
}

function Safe({ l, w, h }) {
  return (
    <group>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.steelDark} />
      <B s={[l - 0.12, h - 0.12, 0.04]} p={[0, h / 2, w / 2 + 0.01]} m={MATS.steelDark} />
      <Cyl rTop={0.12} h={0.08} p={[0, h * 0.55, w / 2 + 0.05]} r={[Math.PI / 2, 0, 0]} m={MATS.chrome} seg={16} />
      <B s={[0.06, h * 0.4, 0.05]} p={[l / 2 - 0.18, h / 2, w / 2 + 0.03]} m={MATS.chrome} />
    </group>
  )
}

function Treadmill({ l, w, h }) {
  // folded upright
  return (
    <group>
      <B s={[l, 0.25, w]} p={[0, 0.2, 0]} m={MATS.blackPlastic} />
      <B s={[l * 0.8, h * 0.85, 0.3]} p={[0, h * 0.5, -w * 0.1]} r={[-0.12, 0, 0]} m={MATS.fabricDark} />
      {[-1, 1].map((s) => <B key={s} s={[0.1, h * 0.7, 0.1]} p={[s * (l / 2 - 0.1), h * 0.42, w * 0.18]} m={MATS.steelDark} />)}
      <B s={[l * 0.7, 0.3, 0.12]} p={[0, h * 0.8, w * 0.18]} m={MATS.blackPlastic} />
    </group>
  )
}

function WeightBench({ l, w, h }) {
  return (
    <group>
      <B s={[l * 0.7, 0.14, w * 0.4]} p={[-l * 0.1, h * 0.32, 0]} m={MATS.fabricDark} />
      {[-1, 1].map((s) => <B key={s} s={[0.1, h, 0.1]} p={[l * 0.32, h / 2, s * (w / 2 - 0.1)]} m={MATS.steelDark} />)}
      <Cyl rTop={0.05} h={w + 0.6} p={[l * 0.32, h * 0.9, 0]} r={[Math.PI / 2, 0, 0]} m={MATS.chrome} seg={10} />
      {[-1, 1].map((s) => <Cyl key={s} rTop={0.24} h={0.14} p={[l * 0.32, h * 0.9, s * (w / 2 + 0.2)]} r={[Math.PI / 2, 0, 0]} m={MATS.rubber} seg={16} />)}
      <B s={[0.1, h * 0.32, w * 0.5]} p={[-l * 0.42, h * 0.16, 0]} m={MATS.steelDark} />
    </group>
  )
}

function Box({ l, w, h, seed }) {
  return (
    <group rotation={[0, (seeded(seed, 8) - 0.5) * 0.2, 0]}>
      <B s={[l, h, w]} p={[0, h / 2, 0]} m={MATS.cardboard} />
      <B s={[l + 0.02, 0.1, w * 0.3]} p={[0, h - 0.04, 0]} m={MATS.cardboardTape} />
      {[-1, 1].map((s) => <B key={s} s={[l * 0.48, 0.04, w * 0.96]} p={[s * l * 0.26, h - 0.01, 0]} r={[0, 0, s * 0.05]} m={MATS.cardboard} />)}
    </group>
  )
}

function Bag({ l, w, h, seed }) {
  return (
    <group>
      <mesh position={[0, h * 0.45, 0]} scale={[l / 2, h * 0.5, w / 2]} material={MATS.bagBlack} castShadow receiveShadow>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
      <mesh position={[(seeded(seed, 1) - 0.5) * l * 0.3, h * 0.6, (seeded(seed, 2) - 0.5) * w * 0.3]} scale={[l * 0.3, h * 0.32, w * 0.3]} material={MATS.bagBlack} castShadow>
        <sphereGeometry args={[1, 12, 10]} />
      </mesh>
      <Cyl rTop={0.07} h={0.18} p={[0, h * 0.92, 0]} m={MATS.bagBlack} seg={8} />
    </group>
  )
}

function Tarp({ l, w, h, seed }) {
  const m = seeded(seed, 4) > 0.5 ? MATS.tarpBlue : MATS.tarpGreen
  return (
    <group>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} castShadow receiveShadow material={m}
          position={[(seeded(i, seed) - 0.5) * l * 0.4, h * (0.3 + seeded(i, 2) * 0.3), (seeded(i, 3) - 0.5) * w * 0.4]}
          scale={[l * (0.3 + seeded(i, 5) * 0.25), h * 0.45, w * (0.3 + seeded(i, 6) * 0.25)]}>
          <sphereGeometry args={[1, 12, 9]} />
        </mesh>
      ))}
      <mesh position={[0, h * 0.42, 0]} scale={[l / 2, h * 0.52, w / 2]} material={m} receiveShadow>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
    </group>
  )
}

/* ================= REGISTRY ================= */

export const MODEL_REGISTRY = {
  sofa: Sofa,
  recliner: Recliner,
  table: Table,
  chair: Chair,
  dresser: Dresser,
  bookshelf: Bookshelf,
  desk: Desk,
  bedframe: BedFrame,
  wardrobe: Wardrobe,
  filing: Filing,
  officechair: OfficeChair,
  tvstand: TVStand,
  mattress: Mattress,
  boxspring: BoxSpring,
  fridge: Fridge,
  chestfreezer: ChestFreezer,
  washer: Washer,
  dryer: Dryer,
  stove: Stove,
  dishwasher: Dishwasher,
  microwave: Microwave,
  waterheater: WaterHeater,
  acunit: ACUnit,
  acportable: ACPortable,
  tv: TV,
  monitor: Monitor,
  tower: Tower,
  printer: Printer,
  pushmower: PushMower,
  ridingmower: RidingMower,
  bicycle: Bicycle,
  tire: (p) => <Tire {...p} />,
  tirerim: (p) => <Tire {...p} rim />,
  grill: Grill,
  patiochair: PatioChair,
  patiotable: PatioTable,
  hottub: HotTub,
  trampoline: Trampoline,
  panelstack: PanelStack,
  drywall: Drywall,
  lumber: Lumber,
  carpetroll: CarpetRoll,
  rubble: Rubble,
  pianoupright: PianoUpright,
  pianogrand: PianoGrand,
  safe: Safe,
  treadmill: Treadmill,
  weightbench: WeightBench,
  box: Box,
  bag: Bag,
  tarp: Tarp,
}

export function ItemModel({ unit }) {
  const Model = MODEL_REGISTRY[unit.model] || Tarp
  return <Model l={unit.l} w={unit.w} h={unit.h} seed={unit.seq + unit.itemId.length} />
}
