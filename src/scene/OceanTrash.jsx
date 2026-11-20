import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';

const g = world.gear;

function makeKit() {
  return {
    cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
    sphere: new THREE.SphereGeometry(1, 16, 12),
    half: new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    cone: new THREE.ConeGeometry(1, 1, 12),
    torus: new THREE.TorusGeometry(1, 0.15, 6, 16),
    knot: new THREE.IcosahedronGeometry(1, 1),
    bottle: new THREE.MeshStandardMaterial({ color: '#9fe3d4', transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }),
    cap: new THREE.MeshStandardMaterial({ color: '#2f7de1', roughness: 0.4 }),
    bag: new THREE.MeshStandardMaterial({ color: '#f4f7f8', transparent: true, opacity: 0.45, roughness: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    can: new THREE.MeshStandardMaterial({ color: '#d8352f', metalness: 0.6, roughness: 0.35 }),
    rim: new THREE.MeshStandardMaterial({ color: '#c9ced3', metalness: 0.9, roughness: 0.25 }),
    net: new THREE.MeshStandardMaterial({ color: '#5aa36a', wireframe: true }),
    buoyRed: new THREE.MeshStandardMaterial({ color: '#e8412c', roughness: 0.5 }),
    buoyWhite: new THREE.MeshStandardMaterial({ color: '#f6f3ea', roughness: 0.5 }),
    conch: new THREE.MeshStandardMaterial({ color: '#f7b9a0', roughness: 0.5 }),
    shell: new THREE.MeshStandardMaterial({ color: '#d7c7e8', roughness: 0.4, side: THREE.DoubleSide }),
    pearl: new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.1, metalness: 0.3, emissive: '#fff4d8', emissiveIntensity: 0.4 }),
    gold: new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 0.9, roughness: 0.25, emissive: '#7a5200', emissiveIntensity: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: '#4caf6a', transparent: true, opacity: 0.6, roughness: 0.1, depthWrite: false }),
    paper: new THREE.MeshStandardMaterial({ color: '#f3e3b8', roughness: 0.9 }),
  };
}

// One model per kind of item; the slot shows the one it holds today.
function Models({ kit }) {
  return {
    bottle: (
      <group rotation={[0, 0, 1.2]}>
        <mesh geometry={kit.cyl} material={kit.bottle} scale={[0.07, 0.26, 0.07]} />
        <mesh geometry={kit.cyl} material={kit.bottle} position={[0, 0.16, 0]} scale={[0.035, 0.08, 0.035]} />
        <mesh geometry={kit.cyl} material={kit.cap} position={[0, 0.21, 0]} scale={[0.04, 0.03, 0.04]} />
      </group>
    ),
    bag: (
      <group>
        <mesh geometry={kit.half} material={kit.bag} scale={[0.22, 0.26, 0.2]} />
        <mesh geometry={kit.torus} material={kit.bag} position={[0, 0.26, 0]} scale={0.06} />
      </group>
    ),
    can: (
      <group rotation={[0.4, 0, 1.4]}>
        <mesh geometry={kit.cyl} material={kit.can} scale={[0.07, 0.17, 0.07]} />
        <mesh geometry={kit.cyl} material={kit.rim} position={[0, 0.09, 0]} scale={[0.068, 0.012, 0.068]} />
      </group>
    ),
    net: <mesh geometry={kit.knot} material={kit.net} scale={0.2} />,
    buoy: (
      <group>
        <mesh geometry={kit.sphere} material={kit.buoyRed} scale={0.24} />
        <mesh geometry={kit.cyl} material={kit.buoyWhite} scale={[0.245, 0.08, 0.245]} />
        <mesh geometry={kit.torus} material={kit.buoyWhite} rotation={[Math.PI / 2, 0, 0]} scale={0.28} />
        <mesh geometry={kit.cyl} material={kit.buoyWhite} position={[0, 0.34, 0]} scale={[0.012, 0.22, 0.012]} />
        <mesh geometry={kit.cone} material={kit.buoyRed} position={[0.05, 0.4, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.04, 0.09, 0.01]} />
      </group>
    ),
    conch: (
      <group rotation={[0, 0, 1.3]}>
        <mesh geometry={kit.cone} material={kit.conch} scale={[0.09, 0.24, 0.09]} />
        <mesh geometry={kit.sphere} material={kit.conch} position={[0, -0.1, 0]} scale={[0.1, 0.08, 0.1]} />
      </group>
    ),
    pearl: (
      <group>
        <mesh geometry={kit.half} material={kit.shell} rotation={[Math.PI, 0, 0]} scale={[0.14, 0.05, 0.12]} />
        <mesh geometry={kit.half} material={kit.shell} position={[0, 0.02, -0.08]} rotation={[-1.1, 0, 0]} scale={[0.14, 0.05, 0.12]} />
        <mesh geometry={kit.sphere} material={kit.pearl} position={[0, 0.03, 0]} scale={0.045} />
      </group>
    ),
    coin: <mesh geometry={kit.cyl} material={kit.gold} rotation={[0.3, 0, 0.2]} scale={[0.09, 0.015, 0.09]} />,
    message: (
      <group rotation={[0, 0.4, 1.5]}>
        <mesh geometry={kit.cyl} material={kit.glass} scale={[0.06, 0.22, 0.06]} />
        <mesh geometry={kit.cyl} material={kit.paper} scale={[0.03, 0.16, 0.03]} />
        <mesh geometry={kit.cyl} material={kit.paper} position={[0, 0.13, 0]} scale={[0.028, 0.03, 0.028]} />
      </group>
    ),
  };
}

function Slot({ it, models }) {
  const root = useRef();
  const parts = useRef({});
  useFrame(() => {
    const on = it.active;
    root.current.visible = on;
    if (!on) return;
    root.current.position.copy(it.pos);
    for (const [type, el] of Object.entries(parts.current)) if (el) el.visible = type === it.type;
    const t = world.time;
    if (it.type === 'bag') {
      // A drifting plastic bag pulses like a jellyfish: exactly why turtles mistake it for food.
      const p = 1 + Math.sin(t * 2 + it.phase) * 0.12;
      root.current.scale.set(p, 1 / p, p);
    } else root.current.scale.setScalar(1 - Math.min(1, it.fade / 1.5));
    if (!it.resting && it.kind === 'trash') root.current.rotation.set(Math.sin(t * 0.6 + it.phase) * 0.4, t * 0.3 + it.spin, Math.cos(t * 0.5 + it.phase) * 0.3);
    else root.current.rotation.set(0, it.spin, 0);
  });
  return (
    <group ref={root} visible={false}>
      {Object.entries(models).map(([type, node]) => (
        <group key={type} ref={(el) => (parts.current[type] = el)} visible={false}>
          {node}
        </group>
      ))}
    </group>
  );
}

// Rubbish to clean up, practice buoys, and treasure on the sand (only while the submarine is out).
export default function OceanTrash() {
  const kit = useMemo(makeKit, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  const models = useMemo(() => Models({ kit }), [kit]);
  return g.items.map((it, i) => <Slot key={i} it={it} models={models} />);
}
