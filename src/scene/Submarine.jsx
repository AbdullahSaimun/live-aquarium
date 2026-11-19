import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { updateSub, SUB_Z } from '../sim/submarine';
import { tapSubmarine } from '../state/store';
import { glowTexture } from './NightLife';

const SCALE = 0.62;
const prop = new THREE.Vector3();

function makeKit() {
  const beam = new THREE.ConeGeometry(0.9, 3, 24, 1, true);
  beam.rotateZ(Math.PI / 2); // apex towards -x, wide end ahead
  beam.translate(2.5, 0, 0); // apex at the nose
  const tail = new THREE.ConeGeometry(0.34, 0.55, 18);
  tail.rotateZ(Math.PI / 2); // points backwards (-x)
  return {
    sphere: new THREE.SphereGeometry(1, 28, 18),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
    torus: new THREE.TorusGeometry(1, 0.22, 8, 20),
    box: new THREE.BoxGeometry(1, 1, 1),
    tail,
    beam,
    hull: new THREE.MeshStandardMaterial({ color: '#ffc93c', roughness: 0.38, metalness: 0.25 }),
    trim: new THREE.MeshStandardMaterial({ color: '#f08a24', roughness: 0.45, metalness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: '#8a9bb0', roughness: 0.35, metalness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: '#9fe6ff', emissive: '#5fd0ff', emissiveIntensity: 0.4, roughness: 0.1, metalness: 0.1 }),
    lamp: new THREE.MeshBasicMaterial({ color: '#fff7d0' }),
    beamMat: new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    glow: new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff2c0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// A cute yellow submarine: round hull, conning tower with a periscope, glowing portholes,
// a spinning propeller and a headlight beam that shows best at night.
export default function Submarine() {
  const kit = useMemo(makeKit, []);
  useEffect(
    () => () => {
      kit.glow.map.dispose();
      Object.values(kit).forEach((x) => x.dispose());
    },
    [kit],
  );
  const { camera, size } = useThree();
  const root = useRef();
  const body = useRef();
  const propeller = useRef();
  const beam = useRef();
  const glow = useRef();
  const trail = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = world.sub;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const free = 1 - Math.min(world.viewInset || 0, size.width * 0.4) / size.width;
    const edge = Math.max(1.5, (camera.position.z - SUB_Z) * tanH * (size.width / size.height) * free);
    updateSub(dt, edge);
    const on = s.phase !== 'idle';
    root.current.visible = on;
    if (!on) return;

    const t = world.time;
    root.current.position.copy(s.pos);
    root.current.rotation.y = s.face;
    // Nose dips when diving and lifts when rising; a slow rock from side to side.
    body.current.rotation.z = THREE.MathUtils.clamp(s.vel.y * 0.35, -0.3, 0.3) * (s.dir > 0 ? 1 : -1) + Math.sin(t * 0.9) * 0.03;
    body.current.rotation.x = Math.sin(t * 0.7) * 0.04;
    body.current.position.y = Math.sin(t * 1.1) * 0.03;
    propeller.current.rotation.x += dt * (3 + s.speed * 14);

    const night = 1 - world.light;
    beam.current.visible = s.light;
    glow.current.visible = s.light;
    kit.beamMat.opacity = 0.05 + night * 0.16;
    kit.glass.emissiveIntensity = 0.3 + night * 0.9;

    // A trail of bubbles from the propeller while it moves.
    trail.current -= dt * (0.5 + s.speed * 2.5);
    if (trail.current <= 0) {
      trail.current = 1;
      propeller.current.getWorldPosition(prop);
      queueEffect('bubbles', prop, s.speed > 0.6 ? 2 : 1);
    }
  });

  const onClick = (e) => {
    e.stopPropagation();
    tapSubmarine();
  };

  return (
    <group ref={root} visible={false} scale={SCALE}>
      <group ref={body}>
        {/* hull */}
        <mesh geometry={kit.sphere} material={kit.hull} scale={[1.05, 0.52, 0.52]} />
        <mesh geometry={kit.tail} material={kit.hull} position={[-1.05, 0, 0]} />
        <mesh geometry={kit.torus} material={kit.trim} position={[0.62, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.45, 0.45, 0.6]} />
        {/* tower, hatch and periscope */}
        <mesh geometry={kit.cyl} material={kit.hull} position={[0.1, 0.52, 0]} scale={[0.24, 0.32, 0.2]} />
        <mesh geometry={kit.sphere} material={kit.trim} position={[0.1, 0.69, 0]} scale={[0.24, 0.07, 0.2]} />
        <mesh geometry={kit.cyl} material={kit.steel} position={[0.2, 0.92, 0]} scale={[0.035, 0.42, 0.035]} />
        <mesh geometry={kit.cyl} material={kit.steel} position={[0.28, 1.12, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.04, 0.18, 0.04]} />
        {/* portholes on both sides */}
        {[1, -1].map((side) =>
          [0.45, 0.05, -0.35].map((x) => (
            <group key={`${side}${x}`} position={[x, 0.05, side * 0.47 * Math.sqrt(1 - (x / 1.05) ** 2)]}>
              <mesh geometry={kit.cyl} material={kit.glass} rotation={[Math.PI / 2, 0, 0]} scale={[0.11, 0.04, 0.11]} />
              <mesh geometry={kit.torus} material={kit.trim} scale={0.12} />
            </group>
          )),
        )}
        {/* fins */}
        <mesh geometry={kit.box} material={kit.trim} position={[-1.1, 0.26, 0]} scale={[0.3, 0.26, 0.03]} />
        <mesh geometry={kit.box} material={kit.trim} position={[-1.1, -0.26, 0]} scale={[0.3, 0.26, 0.03]} />
        <mesh geometry={kit.box} material={kit.trim} position={[-1.1, 0, 0]} scale={[0.3, 0.03, 0.62]} />
        {/* propeller */}
        <group ref={propeller} position={[-1.38, 0, 0]}>
          <mesh geometry={kit.sphere} material={kit.steel} scale={[0.07, 0.07, 0.07]} />
          {[0, 1, 2].map((i) => (
            <mesh key={i} geometry={kit.box} material={kit.steel} rotation={[(i * Math.PI * 2) / 3, 0, 0]} position={[0, 0, 0]} scale={[0.03, 0.34, 0.08]} />
          ))}
        </group>
        {/* headlight */}
        <mesh geometry={kit.sphere} material={kit.lamp} position={[1.02, -0.12, 0]} scale={0.07} />
        <sprite ref={glow} material={kit.glow} position={[1.12, -0.12, 0]} scale={0.6} />
        <mesh ref={beam} geometry={kit.beam} material={kit.beamMat} position={[0, -0.12, 0]} />
      </group>
      {/* a generous tap area */}
      <mesh
        geometry={kit.sphere}
        material={kit.hidden}
        scale={[1.5, 0.9, 0.8]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
