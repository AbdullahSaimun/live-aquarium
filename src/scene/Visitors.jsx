import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { updateVisitor } from '../sim/visitors';
import { showCreature, sfx } from '../state/store';

const SPAN = 19; // starts and ends this far off-centre, well outside the view
const DEPTH = { manta: -8.5, dolphin: -9.5, whale: -13 };
const HIT = { manta: [2.4, 0.6, 1.5], dolphin: [0.7, 0.7, 1.7], whale: [1.6, 1.4, 4.8] };
const spout = new THREE.Vector3();

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  return {
    sphere: new THREE.SphereGeometry(1, 24, 16),
    small: new THREE.SphereGeometry(1, 10, 8),
    cone: new THREE.ConeGeometry(1, 1, 8),
    capsule: new THREE.CapsuleGeometry(1, 2, 4, 8),
    mantaTop: std('#34557a'),
    mantaBelly: std('#e3edf5'),
    dolphin: std('#8ea9c2'),
    dolphinBelly: std('#e6eef5'),
    whale: std('#4d6b8c'),
    whaleBelly: std('#a8bccf'),
    white: std('#ffffff', { roughness: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

function Eyes({ kit, x, y, z, r }) {
  return [1, -1].map((side) => (
    <group key={side} position={[side * x, y, z]}>
      <mesh geometry={kit.small} material={kit.white} scale={r} />
      <mesh geometry={kit.small} material={kit.pupil} position={[side * r * 0.4, 0, r * 0.5]} scale={r * 0.55} />
    </group>
  ));
}

// Models face +z; the parent turns them towards where they travel.
function Manta({ kit, wings }) {
  return (
    <group scale={1.5}>
      <mesh geometry={kit.sphere} material={kit.mantaTop} scale={[0.75, 0.16, 0.85]} />
      <mesh geometry={kit.sphere} material={kit.mantaBelly} position={[0, -0.04, 0.02]} scale={[0.68, 0.12, 0.78]} />
      {[1, -1].map((side, i) => (
        <group key={side} ref={(el) => (wings.current[i] = el)} position={[side * 0.55, 0, 0]}>
          <mesh geometry={kit.sphere} material={kit.mantaTop} position={[side * 0.75, 0, -0.1]} scale={[0.95, 0.05, 0.5]} rotation={[0, side * 0.35, 0]} />
        </group>
      ))}
      {[1, -1].map((side) => (
        <mesh key={side} geometry={kit.capsule} material={kit.mantaTop} position={[side * 0.28, -0.02, 0.85]} scale={[0.05, 0.08, 0.05]} rotation={[Math.PI / 2, 0, 0]} />
      ))}
      <mesh geometry={kit.capsule} material={kit.mantaTop} position={[0, 0, -1.25]} scale={[0.02, 0.25, 0.02]} rotation={[Math.PI / 2, 0, 0]} />
      <Eyes kit={kit} x={0.42} y={0.08} z={0.62} r={0.07} />
    </group>
  );
}

function Dolphin({ kit, tail }) {
  return (
    <group scale={1.1}>
      <mesh geometry={kit.sphere} material={kit.dolphin} scale={[0.32, 0.34, 1.2]} />
      <mesh geometry={kit.sphere} material={kit.dolphinBelly} position={[0, -0.1, 0.1]} scale={[0.27, 0.24, 1.0]} />
      <mesh geometry={kit.capsule} material={kit.dolphin} position={[0, -0.08, 1.25]} scale={[0.08, 0.1, 0.07]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={kit.cone} material={kit.dolphin} position={[0, 0.38, -0.15]} scale={[0.06, 0.38, 0.22]} rotation={[-0.5, 0, 0]} />
      {[1, -1].map((side) => (
        <mesh key={side} geometry={kit.sphere} material={kit.dolphin} position={[side * 0.3, -0.2, 0.35]} scale={[0.22, 0.03, 0.1]} rotation={[0, side * 0.5, side * -0.4]} />
      ))}
      <group ref={tail} position={[0, 0, -1.1]}>
        <mesh geometry={kit.capsule} material={kit.dolphin} position={[0, 0, -0.15]} scale={[0.09, 0.12, 0.09]} rotation={[Math.PI / 2, 0, 0]} />
        {[1, -1].map((side) => (
          <mesh key={side} geometry={kit.sphere} material={kit.dolphin} position={[side * 0.22, 0, -0.42]} scale={[0.26, 0.03, 0.12]} rotation={[0, side * -0.5, 0]} />
        ))}
      </group>
      <Eyes kit={kit} x={0.24} y={0.06} z={0.85} r={0.06} />
    </group>
  );
}

function Whale({ kit, tail }) {
  return (
    <group scale={1.15}>
      <mesh geometry={kit.sphere} material={kit.whale} scale={[1.1, 1.0, 3.8]} />
      <mesh geometry={kit.sphere} material={kit.whaleBelly} position={[0, -0.32, 0.6]} scale={[0.9, 0.7, 3.0]} />
      <mesh geometry={kit.cone} material={kit.whale} position={[0, 0.95, -2.2]} scale={[0.08, 0.35, 0.3]} rotation={[-0.6, 0, 0]} />
      {[1, -1].map((side) => (
        <mesh key={side} geometry={kit.sphere} material={kit.whale} position={[side * 1.05, -0.5, 1.2]} scale={[0.8, 0.07, 0.3]} rotation={[0, side * 0.6, side * -0.5]} />
      ))}
      <group ref={tail} position={[0, 0, -3.5]}>
        <mesh geometry={kit.capsule} material={kit.whale} position={[0, 0, -0.5]} scale={[0.3, 0.45, 0.3]} rotation={[Math.PI / 2, 0, 0]} />
        {[1, -1].map((side) => (
          <mesh key={side} geometry={kit.sphere} material={kit.whale} position={[side * 0.75, 0, -1.25]} scale={[0.9, 0.08, 0.38]} rotation={[0, side * -0.45, 0]} />
        ))}
      </group>
      <Eyes kit={kit} x={0.9} y={-0.05} z={2.4} r={0.13} />
    </group>
  );
}

// The big animals that pass far behind the reef, one at a time (see sim/visitors.js).
export default function Visitors() {
  const kit = useMemo(makeKit, []);
  const root = useRef();
  const models = { manta: useRef(), dolphin: useRef(), whale: useRef() };
  const wings = useRef([]);
  const dolphinTail = useRef();
  const whaleTail = useRef();
  const nextSpout = useRef(0);
  const hit = useRef();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    updateVisitor(dt);
    const v = world.visitor;
    const t = world.time;
    root.current.visible = !!v.kind;
    for (const [kind, ref] of Object.entries(models)) ref.current.visible = kind === v.kind;
    if (!v.kind) return;

    const k = v.t / v.dur;
    const x = v.dir * (-SPAN + k * SPAN * 2);
    let y = v.y + Math.sin(t * 0.4) * 0.25;
    let pitch = 0;
    if (v.kind === 'dolphin') {
      // Playful arcs up and down as it goes.
      const arc = t * 1.6;
      y = v.y + Math.sin(arc) * 0.9;
      pitch = -Math.cos(arc) * 0.5;
      dolphinTail.current.rotation.x = Math.sin(t * 6) * 0.35;
    } else if (v.kind === 'manta') {
      const flap = Math.sin(t * 1.8);
      wings.current.forEach((w, i) => w && (w.rotation.z = (i ? -1 : 1) * flap * 0.45));
      pitch = Math.sin(t * 0.5) * 0.08;
    } else {
      whaleTail.current.rotation.x = Math.sin(t * 1.1) * 0.25;
      nextSpout.current -= dt;
      if (nextSpout.current <= 0) {
        nextSpout.current = 7;
        queueEffect('bubbles', spout.set(x + v.dir * 2.4, y + 1.4, DEPTH.whale), 14);
      }
    }
    root.current.position.set(x, y, DEPTH[v.kind]);
    // Turn to face the way it travels, then tip the nose up or down.
    root.current.rotation.set(pitch, v.dir * (Math.PI / 2), 0, 'YXZ');
    hit.current.scale.set(...HIT[v.kind]);
  });

  const onClick = (e) => {
    e.stopPropagation();
    const kind = world.visitor.kind;
    if (!kind) return;
    queueEffect('hearts', root.current.position, 3);
    sfx(kind === 'whale' ? 'whale' : 'squeak');
    showCreature(kind);
  };

  return (
    <group ref={root} visible={false}>
      <group ref={models.manta}>
        <Manta kit={kit} wings={wings} />
      </group>
      <group ref={models.dolphin}>
        <Dolphin kit={kit} tail={dolphinTail} />
      </group>
      <group ref={models.whale}>
        <Whale kit={kit} tail={whaleTail} />
      </group>
      <mesh
        ref={hit}
        geometry={kit.sphere}
        material={kit.hidden}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
