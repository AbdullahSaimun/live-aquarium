import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { sharkActive } from '../sim/sharkBrain';
import { showCreature, sfx } from '../state/store';

const HOME = { x: 3.3, z: -1.8 };
const ARMS = 8;
const SEGS = 4;
const HOP_TIME = 0.8;
const INK_TIME = 2.4;
const COLORS = ['#ff7f7f', '#c77dff', '#ff9f5a', '#ff6fa8'].map((c) => new THREE.Color(c));
const PALE = new THREE.Color('#fff2ea');

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  return {
    sphere: new THREE.SphereGeometry(1, 22, 16),
    small: new THREE.SphereGeometry(1, 10, 8),
    seg: new THREE.CapsuleGeometry(1, 2, 3, 8),
    rock: new THREE.DodecahedronGeometry(1, 1),
    smile: new THREE.TorusGeometry(0.08, 0.018, 5, 12, Math.PI),
    skin: std('#ff7f7f'),
    sucker: std('#ffd9cf'),
    white: std('#ffffff', { roughness: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    mouth: std('#7a2a3a'),
    stone: std('#8f84c0', { roughness: 0.9, flatShading: true }),
    ink: new THREE.MeshBasicMaterial({ color: '#1d1b33', transparent: true, opacity: 0, depthWrite: false }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// A friendly octopus by its den on the sand. It slowly shifts colour, waves when tapped, and squirts
// a cloud of ink (then goes pale) whenever the shark comes too close.
export default function Octopus({ calm }) {
  const kit = useMemo(makeKit, []);
  const root = useRef();
  const body = useRef();
  const ink = useRef();
  const arms = useRef([]);
  const s = useRef({ hop: 0, ink: 0, inkCool: 0, wave: 0 });
  const tint = useMemo(() => new THREE.Color(), []);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    const b = world.bounds;
    c.hop = Math.max(0, c.hop - dt);
    c.ink = Math.max(0, c.ink - dt);
    c.inkCool = Math.max(0, c.inkCool - dt);
    c.wave = Math.max(0, c.wave - dt);
    const x = THREE.MathUtils.clamp(HOME.x, b.minX + 0.6, b.maxX - 0.5);
    root.current.position.set(x, world.floorY, HOME.z);
    world.octopusPos.copy(root.current.position);
    const crabNear = Math.hypot(world.crabPos.x - x, world.crabPos.z - HOME.z) < 1.8;

    if (sharkActive() && c.inkCool <= 0 && world.shark.pos.distanceTo(root.current.position) < 5) {
      c.ink = INK_TIME;
      c.inkCool = 12;
      queueEffect('bubbles', root.current.position.clone().setY(world.floorY + 0.8), 12);
      sfx('ink');
    }

    // Colour drifts slowly through a little rainbow; ink time turns it pale with fright.
    const k = (t * 0.05) % COLORS.length;
    const i = Math.floor(k);
    tint.copy(COLORS[i]).lerp(COLORS[(i + 1) % COLORS.length], k - i);
    if (c.ink > 0) tint.lerp(PALE, Math.min(1, c.ink));
    kit.skin.color.lerp(tint, 1 - Math.exp(-dt * 3));
    // A soft glow in the dark.
    kit.skin.emissive.copy(kit.skin.color).multiplyScalar((1 - world.light) * 0.35);

    const hopY = c.hop > 0 ? Math.sin((1 - c.hop / HOP_TIME) * Math.PI) * 0.4 : 0;
    const breathe = 1 + Math.sin(t * 1.6) * (calm ? 0.02 : 0.05);
    body.current.position.y = 0.62 + hopY;
    body.current.scale.set(breathe, 1 / breathe, breathe);
    body.current.rotation.z = Math.sin(t * 0.7) * 0.06;

    const sway = calm ? 0.4 : 1;
    arms.current.forEach((arm, a) => {
      if (!arm) return;
      const waving = (c.wave > 0 || crabNear) && (a === 1 || a === 2);
      // Walk down the chain of segments; each one curls a little further out and up.
      let seg = arm.children.find((ch) => ch.isGroup);
      for (let j = 1; seg; j++) {
        seg.rotation.z = waving ? -0.9 + Math.sin(t * 9 + j) * 0.4 : -0.28 + Math.sin(t * 1.4 + a * 0.8 + j * 0.6) * 0.2 * sway;
        seg = seg.children.find((ch) => ch.isGroup);
      }
    });

    const inkK = c.ink / INK_TIME;
    ink.current.visible = c.ink > 0;
    ink.current.scale.setScalar(0.3 + (1 - inkK) * 1.6);
    kit.ink.opacity = inkK * 0.55;
  });

  const onClick = (e) => {
    e.stopPropagation();
    const c = s.current;
    if (c.hop <= 0) c.hop = HOP_TIME;
    c.wave = 1.6;
    queueEffect('hearts', root.current.position.clone().setY(world.floorY + 1.3), 2);
    sfx('squeak');
    showCreature('octopus');
  };

  // One arm: a chain of capsule segments, each bending a little more than the last.
  const arm = (a) => {
    const angle = (a / ARMS) * Math.PI * 2 + 0.2;
    return (
      <group key={a} position={[Math.sin(angle) * 0.24, 0.32, Math.cos(angle) * 0.2]} rotation={[0, angle + Math.PI / 2, 0]}>
        <group ref={(el) => (arms.current[a] = el)} rotation={[0, 0, -0.6]}>
          <mesh geometry={kit.seg} material={kit.skin} scale={[0.07, 0.07, 0.07]} position={[0, -0.07, 0]} />
          {Array.from({ length: SEGS - 1 }, (_, j) => j).reduceRight(
            (child, j) => (
              <group position={[0, -0.15, 0]}>
                <mesh geometry={kit.seg} material={kit.skin} scale={0.062 - j * 0.012} position={[0, -0.07, 0]} />
                <mesh geometry={kit.small} material={kit.sucker} scale={0.02} position={[0.04, -0.07, 0]} />
                {child}
              </group>
            ),
            null,
          )}
        </group>
      </group>
    );
  };

  return (
    <group ref={root}>
      <mesh geometry={kit.rock} material={kit.stone} position={[0.35, 0.3, -0.55]} scale={[0.75, 0.55, 0.6]} rotation={[0.4, 0.9, 0]} />
      <group ref={body}>
        <mesh geometry={kit.sphere} material={kit.skin} position={[0, 0.25, -0.06]} scale={[0.4, 0.46, 0.38]} rotation={[-0.3, 0, 0]} />
        {[1, -1].map((side) => (
          <group key={side} position={[side * 0.15, 0.12, 0.27]}>
            <mesh geometry={kit.small} material={kit.white} scale={0.1} />
            <mesh geometry={kit.small} material={kit.pupil} position={[0, 0, 0.065]} scale={0.055} />
          </group>
        ))}
        <mesh geometry={kit.smile} material={kit.mouth} position={[0, -0.04, 0.3]} rotation={[0, 0, Math.PI]} />
        <group position={[0, -0.3, 0]}>{Array.from({ length: ARMS }, (_, a) => arm(a))}</group>
        <mesh
          geometry={kit.sphere}
          material={kit.hidden}
          scale={[0.75, 0.75, 0.7]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
      <mesh ref={ink} geometry={kit.sphere} material={kit.ink} position={[-0.2, 0.7, 0.3]} visible={false} />
    </group>
  );
}
