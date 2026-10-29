import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { updateShark } from '../sim/sharkBrain';
import { sharkEvent, shooShark } from '../state/store';
import { labelEls } from '../state/labels';

const screen = new THREE.Vector3();

// Flat fin drawn in XY (+x pointing backwards), turned into the shark's YZ plane.
function fin(draw) {
  const shape = new THREE.Shape();
  draw(shape);
  const geo = new THREE.ShapeGeometry(shape, 8);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  return {
    sphere: new THREE.SphereGeometry(1, 24, 16),
    small: new THREE.SphereGeometry(1, 12, 10),
    tooth: new THREE.ConeGeometry(0.035, 0.09, 6),
    grin: new THREE.TorusGeometry(0.2, 0.04, 6, 20, Math.PI),
    brow: new THREE.CapsuleGeometry(0.025, 0.14, 3, 6),
    gill: new THREE.CapsuleGeometry(0.012, 0.16, 2, 4),
    hit: new THREE.BoxGeometry(1.5, 1.5, 3.2),
    dorsal: fin((s) => {
      s.moveTo(-0.35, 0);
      s.quadraticCurveTo(0, 0.5, 0.38, 0.78);
      s.quadraticCurveTo(0.26, 0.3, 0.45, 0);
      s.lineTo(-0.35, 0);
    }),
    tail: fin((s) => {
      s.moveTo(0, 0.04);
      s.quadraticCurveTo(0.3, 0.25, 0.62, 0.75);
      s.quadraticCurveTo(0.38, 0.12, 0.42, 0);
      s.quadraticCurveTo(0.36, -0.1, 0.5, -0.5);
      s.quadraticCurveTo(0.28, -0.18, 0, -0.04);
    }),
    skin: std('#6f8fb5', { emissive: '#ff2a2a', emissiveIntensity: 0 }),
    belly: std('#eef4fb'),
    finMat: std('#5c7ca3', { side: THREE.DoubleSide }),
    white: std('#ffffff', { roughness: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    dark: std('#2d3a4f'),
    mouth: std('#7a1f3d'),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

const TEETH = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75];

// A goofy cartoon shark with a toothy grin and grumpy eyebrows. Tap it to bonk it on the nose.
export default function Shark() {
  const kit = useMemo(makeKit, []);
  const root = useRef();
  const pose = useRef();
  const tail = useRef();
  const mouth = useRef();
  const finL = useRef();
  const finR = useRef();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  useFrame(({ camera, size }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const event = updateShark(dt);
    if (event) sharkEvent(event);

    const s = world.shark;
    const g = root.current;
    const label = labelEls.get('shark');
    g.visible = s.phase !== 'idle';
    if (!g.visible) {
      if (label) label.style.transform = 'translate3d(-999px,-999px,0)';
      return;
    }
    const t = world.time;
    g.position.copy(s.pos);
    // Dizzy wobble right after a bonk.
    const dizzy = s.hurt > 0 ? Math.sin(t * 28) * 0.3 * s.hurt : 0;
    pose.current.rotation.set(s.pitch, s.yaw, dizzy, 'YXZ');
    const sway = Math.sin(s.tailPhase);
    tail.current.rotation.y = sway * 0.45;
    pose.current.children[0].rotation.y = -sway * 0.05;
    const flap = Math.sin(s.tailPhase * 0.5) * 0.15;
    finL.current.rotation.z = -2.1 + flap;
    finR.current.rotation.z = 2.1 - flap;
    // Snaps its jaws wide when it lunges; a red flush when bonked.
    mouth.current.scale.y = 1 + s.chomp * 2.4 + (s.phase === 'chasing' ? 0.5 + Math.sin(t * 14) * 0.3 : 0);
    kit.skin.emissiveIntensity = s.hurt * 0.6;

    if (label) {
      screen.copy(s.pos);
      screen.y += 1.25;
      screen.project(camera);
      const x = ((screen.x + 1) / 2) * size.width;
      const y = ((1 - screen.y) / 2) * size.height;
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });

  const onClick = (e) => {
    e.stopPropagation();
    shooShark();
  };

  return (
    <group ref={root} visible={false} scale={1.1}>
      <group ref={pose}>
        <group>
          <mesh geometry={kit.sphere} material={kit.skin} scale={[0.48, 0.52, 1.35]} />
          <mesh geometry={kit.sphere} material={kit.belly} position={[0, -0.17, 0.08]} scale={[0.42, 0.36, 1.18]} />
          <mesh geometry={kit.dorsal} material={kit.finMat} position={[0, 0.42, -0.05]} />
          {[1, -1].map((side) =>
            [0.35, 0.47, 0.59].map((z) => (
              <mesh key={`${side}${z}`} geometry={kit.gill} material={kit.dark} position={[side * 0.44, 0.02, z]} rotation={[0.25, 0, 0]} />
            )),
          )}
        </group>
        <group ref={tail} position={[0, 0.02, -1.22]}>
          <mesh geometry={kit.tail} material={kit.finMat} scale={[1, 1.1, 1]} />
        </group>
        <group ref={finL} position={[0.36, -0.22, 0.3]}>
          <mesh geometry={kit.dorsal} material={kit.finMat} scale={0.8} />
        </group>
        <group ref={finR} position={[-0.36, -0.22, 0.3]}>
          <mesh geometry={kit.dorsal} material={kit.finMat} scale={0.8} />
        </group>

        {/* big googly eyes with grumpy brows */}
        {[1, -1].map((side) => (
          <group key={side} position={[side * 0.3, 0.18, 0.95]}>
            <mesh geometry={kit.small} material={kit.white} scale={0.14} />
            <mesh geometry={kit.small} material={kit.pupil} position={[side * 0.03, -0.01, 0.1]} scale={0.07} />
            <mesh geometry={kit.small} material={kit.white} position={[side * 0.05, 0.03, 0.15]} scale={0.022} />
            <mesh geometry={kit.brow} material={kit.dark} position={[0, 0.15, 0.06]} rotation={[0, 0, Math.PI / 2 - side * 0.45]} />
          </group>
        ))}

        {/* toothy grin */}
        <group ref={mouth} position={[0, -0.12, 1.2]} rotation={[0.35, 0, 0]}>
          <mesh geometry={kit.grin} material={kit.mouth} rotation={[0, 0, Math.PI]} />
          {TEETH.map((a) => (
            <mesh
              key={a}
              geometry={kit.tooth}
              material={kit.white}
              position={[Math.sin(a) * 0.2, -Math.cos(a) * 0.2 + 0.05, 0.02]}
            />
          ))}
        </group>
        <mesh
          geometry={kit.hit}
          material={kit.hidden}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
    </group>
  );
}
