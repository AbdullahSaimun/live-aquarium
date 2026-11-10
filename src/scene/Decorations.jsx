import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world, queueEffect } from '../sim/world';
import { useStore } from '../state/store';
import { DECOR_SPOTS, reefTime, sandY } from './reefLayout';
import { makeRockMaterial } from './Rocks';

const v3 = new THREE.Vector3();

// A rainbow sea fan: a lacy half-disc whose colours drift slowly around the spectrum.
function fanMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    THREE.Material.prototype.onBeforeCompile.call(mat, shader); // shared underwater light
    shader.uniforms.uReefTime = reefTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFan;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFan = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFan;\nuniform float uReefTime;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float r = length(vFan);
        float a = atan(vFan.y, vFan.x);
        // Lace: thin radial ribs and rings, with see-through holes between them.
        float ribs = abs(fract(a * 7.0 + sin(r * 6.0) * 0.4) - 0.5);
        float rings = abs(fract(r * 6.0) - 0.5);
        if (ribs > 0.38 && rings > 0.32 && r > 0.15 && r < 0.96) discard;
        float h = fract(r * 0.6 + uReefTime * 0.04);
        vec3 col = 0.55 + 0.45 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67)));
        diffuseColor.rgb *= col;`,
      );
  };
  mat.customProgramCacheKey = () => 'rainbow-fan';
  return mat;
}

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  // A shallow open hull for the shipwreck: the lower half of a stretched sphere.
  const hull = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const volcano = new THREE.CylinderGeometry(0.2, 0.75, 0.75, 18, 4, true);
  const vp = volcano.attributes.position;
  for (let i = 0; i < vp.count; i++) {
    const a = Math.atan2(vp.getZ(i), vp.getX(i));
    const k = 1 + Math.sin(a * 5 + vp.getY(i) * 6) * 0.06;
    vp.setX(i, vp.getX(i) * k);
    vp.setZ(i, vp.getZ(i) * k);
  }
  volcano.translate(0, 0.375, 0);
  volcano.computeVertexNormals();
  const arch = new THREE.TorusGeometry(0.75, 0.24, 10, 28, Math.PI);
  const ap = arch.attributes.position;
  for (let i = 0; i < ap.count; i++) {
    const x = ap.getX(i);
    const y = ap.getY(i);
    const z = ap.getZ(i);
    const n = 1 + Math.sin(x * 7 + z * 5) * 0.06 + Math.sin(y * 9) * 0.05;
    ap.setXYZ(i, x * (1 + (n - 1) * 0.3), y, z * n);
  }
  arch.computeVertexNormals();
  return {
    sphere: new THREE.SphereGeometry(1, 20, 14),
    small: new THREE.SphereGeometry(1, 10, 8),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
    cone: new THREE.ConeGeometry(1, 1, 14),
    box: new THREE.BoxGeometry(1, 1, 1),
    torus: new THREE.TorusGeometry(1, 0.12, 8, 20),
    halfRing: new THREE.TorusGeometry(0.35, 0.05, 8, 16, Math.PI),
    disc: new THREE.CircleGeometry(1, 20),
    fan: new THREE.CircleGeometry(1, 40, 0, Math.PI),
    plane: new THREE.PlaneGeometry(1, 1, 6, 6),
    hull,
    volcano,
    arch,
    fanMat: fanMaterial(),
    rust: std('#6f4c3c', { roughness: 0.85, metalness: 0.3 }),
    brass: std('#c9953b', { roughness: 0.35, metalness: 0.7 }),
    glass: std('#1f4256', { roughness: 0.1, emissive: '#2c6f8f', emissiveIntensity: 0.15 }),
    sandWall: std('#e9cf9c', { roughness: 0.95 }),
    roofPink: std('#ff8fa3'),
    roofBlue: std('#8fb3ff'),
    door: std('#5b3d22'),
    flag: std('#ffd23f', { side: THREE.DoubleSide }),
    stalk: std('#5aa05a'),
    lanterns: ['#ff6fa8', '#ffa94d', '#ffe066', '#5ce1e6', '#b388ff'].map((c) => std(c, { emissive: c, emissiveIntensity: 0.15, roughness: 0.3 })),
    volcanoRock: std('#5d4a44', { roughness: 0.95, flatShading: true, side: THREE.DoubleSide }),
    lava: std('#ff7a2f', { emissive: '#ff5a1f', emissiveIntensity: 0.9 }),
    rock: makeRockMaterial(),
    wood: std('#6e5136', { roughness: 0.9, side: THREE.DoubleSide }),
    woodDark: std('#3b2b1e', { roughness: 1, side: THREE.BackSide }),
    sail: std('#efe4c8', { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
  };
}

function FanCoral({ kit, calm }) {
  const g = useRef();
  useFrame(() => {
    g.current.rotation.y = Math.sin(world.time * 0.6) * (calm ? 0.03 : 0.08);
  });
  return (
    <group ref={g}>
      <mesh geometry={kit.cyl} material={kit.stalk} position={[0, 0.12, 0]} scale={[0.05, 0.24, 0.05]} />
      <mesh geometry={kit.fan} material={kit.fanMat} position={[0, 0.2, 0]} scale={1.05} />
    </group>
  );
}

function Anchor({ kit }) {
  return (
    <group rotation={[0, 0, 1.3]} position={[0, 0.12, 0]}>
      <mesh geometry={kit.cyl} material={kit.rust} scale={[0.06, 1.2, 0.06]} position={[0, 0.2, 0]} />
      <mesh geometry={kit.cyl} material={kit.rust} scale={[0.04, 0.6, 0.04]} position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={kit.torus} material={kit.rust} scale={0.09} position={[0, 0.86, 0]} rotation={[0, Math.PI / 2, 0]} />
      <mesh geometry={kit.halfRing} material={kit.rust} position={[0, -0.32, 0]} rotation={[0, 0, Math.PI]} />
      {[1, -1].map((side) => (
        <mesh key={side} geometry={kit.cone} material={kit.rust} scale={[0.09, 0.2, 0.04]} position={[side * 0.35, -0.22, 0]} rotation={[0, 0, side * 0.5]} />
      ))}
      {/* the chain trails off across the sand */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          geometry={kit.torus}
          material={kit.rust}
          scale={[0.07, 0.045, 0.07]}
          position={[0.05 + i * 0.03, 0.95 + i * 0.12, i % 2 ? 0.04 : -0.02]}
          rotation={[i % 2 ? Math.PI / 2 : 0, 0, 0.3]}
        />
      ))}
    </group>
  );
}

function Diver({ kit, pos }) {
  const puff = useRef(2);
  useFrame((_, dt) => {
    puff.current -= Math.min(dt, 0.1);
    if (puff.current <= 0) {
      puff.current = 3.5 + Math.random() * 3;
      queueEffect('bubbles', v3.set(pos[0], pos[1] + 0.75, pos[2]), 4);
    }
  });
  return (
    <group>
      <mesh geometry={kit.cyl} material={kit.brass} position={[0, 0.07, 0]} scale={[0.32, 0.14, 0.3]} />
      <mesh geometry={kit.sphere} material={kit.brass} position={[0, 0.42, 0]} scale={0.33} />
      <mesh geometry={kit.cyl} material={kit.brass} position={[0, 0.78, 0]} scale={[0.06, 0.08, 0.06]} />
      {/* three portholes with brass rims */}
      {[
        [0, 0.42, 0.32, 0, 0.13],
        [0.3, 0.42, 0.08, Math.PI / 2.4, 0.08],
        [-0.3, 0.42, 0.08, -Math.PI / 2.4, 0.08],
      ].map(([x, y, z, ry, r], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, ry, 0]}>
          <mesh geometry={kit.disc} material={kit.glass} scale={r} position={[0, 0, 0.005]} />
          <mesh geometry={kit.torus} material={kit.brass} scale={[r, r, r * 1.3]} />
        </group>
      ))}
    </group>
  );
}

function Castle({ kit }) {
  const flags = useRef([]);
  useFrame(() => {
    flags.current.forEach((f, i) => f && (f.rotation.y = Math.sin(world.time * 2 + i) * 0.4));
  });
  const towers = [
    [-0.5, 0.85, kit.roofPink],
    [0.5, 0.7, kit.roofBlue],
    [0, 1.05, kit.roofPink],
  ];
  return (
    <group>
      <mesh geometry={kit.box} material={kit.sandWall} position={[0, 0.22, 0.05]} scale={[1.05, 0.44, 0.45]} />
      {[-0.4, -0.2, 0, 0.2, 0.4].map((x) => (
        <mesh key={x} geometry={kit.box} material={kit.sandWall} position={[x, 0.48, 0.25]} scale={[0.1, 0.09, 0.08]} />
      ))}
      <mesh geometry={kit.disc} material={kit.door} position={[0, 0.16, 0.282]} scale={[0.12, 0.16, 1]} />
      {towers.map(([x, h, roof], i) => (
        <group key={i} position={[x, 0, i === 2 ? -0.12 : 0]}>
          <mesh geometry={kit.cyl} material={kit.sandWall} position={[0, h / 2, 0]} scale={[0.17, h, 0.17]} />
          <mesh geometry={kit.cone} material={roof} position={[0, h + 0.15, 0]} scale={[0.22, 0.3, 0.22]} />
          <mesh geometry={kit.disc} material={kit.door} position={[0, h * 0.7, 0.171]} scale={[0.04, 0.06, 1]} />
          <mesh geometry={kit.cyl} material={kit.door} position={[0, h + 0.38, 0]} scale={[0.01, 0.2, 0.01]} />
          <mesh
            ref={(el) => (flags.current[i] = el)}
            geometry={kit.plane}
            material={kit.flag}
            position={[0.06, h + 0.43, 0]}
            scale={[0.12, 0.07, 1]}
          />
        </group>
      ))}
    </group>
  );
}

function Lanterns({ kit, calm }) {
  const g = useRef([]);
  const items = useMemo(
    () => [
      [0, 0.7, 0, 0.17],
      [0.32, 0.5, 0.1, 0.13],
      [-0.3, 0.55, 0.08, 0.14],
      [0.15, 0.38, -0.25, 0.12],
      [-0.12, 0.45, -0.28, 0.12],
    ],
    [],
  );
  useFrame(() => {
    const t = world.time;
    const night = 1 - world.light;
    kit.lanterns.forEach((m, i) => (m.emissiveIntensity = 0.15 + night * (0.9 + Math.sin(t * 1.5 + i) * 0.2)));
    g.current.forEach((el, i) => el && (el.rotation.z = Math.sin(t * 0.9 + i) * (calm ? 0.03 : 0.08)));
  });
  return items.map(([x, h, z, r], i) => (
    <group key={i} ref={(el) => (g.current[i] = el)} position={[x, 0, z]}>
      <mesh geometry={kit.cyl} material={kit.stalk} position={[0, h / 2, 0]} scale={[0.025, h, 0.025]} />
      <mesh geometry={kit.sphere} material={kit.lanterns[i]} position={[0, h + r * 0.6, 0]} scale={r} />
    </group>
  ));
}

function Volcano({ kit, pos }) {
  const s = useRef({ next: 4, flash: 0 });
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    c.next -= dt;
    c.flash = Math.max(0, c.flash - dt);
    if (c.next <= 0) {
      c.next = 6 + Math.random() * 5;
      c.flash = 1;
      queueEffect('bubbles', v3.set(pos[0], pos[1] + 0.85, pos[2]), 14);
    }
    kit.lava.emissiveIntensity = 0.7 + Math.sin(world.time * 2) * 0.15 + c.flash * 1.2;
  });
  return (
    <group>
      <mesh geometry={kit.volcano} material={kit.volcanoRock} />
      <mesh geometry={kit.disc} material={kit.lava} position={[0, 0.74, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.19} />
      {[0.4, 2.2, 4.1].map((a) => (
        <mesh
          key={a}
          geometry={kit.cyl}
          material={kit.lava}
          position={[Math.cos(a) * 0.32, 0.45, Math.sin(a) * 0.32]}
          rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}
          scale={[0.025, 0.42, 0.025]}
        />
      ))}
    </group>
  );
}

function Arch({ kit }) {
  return (
    <group scale={1.15}>
      <mesh geometry={kit.arch} material={kit.rock} />
      <mesh geometry={kit.sphere} material={kit.rock} position={[-0.78, 0.05, 0]} scale={[0.38, 0.25, 0.34]} />
      <mesh geometry={kit.sphere} material={kit.rock} position={[0.8, 0.04, 0.02]} scale={[0.34, 0.22, 0.32]} />
    </group>
  );
}

function Shipwreck({ kit }) {
  const sail = useRef();
  useFrame(() => {
    if (sail.current) sail.current.rotation.y = 0.2 + Math.sin(world.time * 0.5) * 0.08;
  });
  return (
    <group rotation={[0.08, 0, 0.22]} position={[0, -0.15, 0]}>
      <mesh geometry={kit.hull} material={kit.wood} scale={[2.2, 0.8, 0.75]} position={[0, 0.65, 0]} />
      <mesh geometry={kit.hull} material={kit.woodDark} scale={[2.15, 0.77, 0.72]} position={[0, 0.66, 0]} />
      {/* a hole in the side where someone could live */}
      <mesh geometry={kit.disc} material={kit.door} position={[0.5, 0.35, 0.72]} scale={[0.2, 0.15, 1]} rotation={[0.2, 0, 0]} />
      {[-1.1, -0.6, 1.0].map((x) => (
        <mesh key={x} geometry={kit.disc} material={kit.glass} position={[x, 0.5, 0.7]} rotation={[0.15, 0, 0]} scale={0.07} />
      ))}
      <mesh geometry={kit.box} material={kit.wood} position={[-1.35, 0.85, 0]} scale={[0.6, 0.4, 0.8]} />
      {/* broken mast with a torn sail */}
      <group position={[0.2, 0.6, 0]} rotation={[0, 0, -0.35]}>
        <mesh geometry={kit.cyl} material={kit.wood} position={[0, 0.85, 0]} scale={[0.06, 1.7, 0.06]} />
        <mesh geometry={kit.cyl} material={kit.wood} position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.035, 0.9, 0.035]} />
        <mesh ref={sail} geometry={kit.plane} material={kit.sail} position={[0.05, 0.95, 0.02]} scale={[0.75, 0.65, 1]} />
      </group>
    </group>
  );
}

const MODELS = { fanCoral: FanCoral, anchor: Anchor, diver: Diver, castle: Castle, lanterns: Lanterns, volcano: Volcano, arch: Arch, shipwreck: Shipwreck };

// One decoration on its spot; a new arrival springs up out of the sand.
function Placed({ id, kit, calm }) {
  const g = useRef();
  const [x, z, , turn] = DECOR_SPOTS[id];
  const pos = useMemo(() => [x, sandY(x, z), z], [x, z]);
  useFrame(() => {
    const pop = world.decorPop;
    const k = pop.id === id ? Math.min(1, (world.time - pop.t) / 0.8) : 1;
    // Ease out with a little overshoot.
    const s = k >= 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
    g.current.scale.setScalar(Math.max(0.001, s));
  });
  const Model = MODELS[id];
  return (
    <group ref={g} position={pos} rotation={[0, turn, 0]}>
      <Model kit={kit} calm={calm} pos={pos} />
    </group>
  );
}

// Every decoration the child has bought and chosen to show.
export default function Decorations({ calm }) {
  const decor = useStore((s) => s.stats.decor || {});
  const kit = useMemo(makeKit, []);
  useEffect(() => () => Object.values(kit).forEach((x) => (Array.isArray(x) ? x.forEach((m) => m.dispose()) : x.dispose())), [kit]);
  return (
    <group>
      {Object.entries(decor)
        .filter(([id, d]) => d.shown && MODELS[id])
        .map(([id]) => (
          <Placed key={id} id={id} kit={kit} calm={calm} />
        ))}
    </group>
  );
}
