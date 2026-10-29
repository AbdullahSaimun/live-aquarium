import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { updateAsma } from '../sim/asmaBrain';
import { asmaEvent, petAsma } from '../state/store';
import { labelEls } from '../state/labels';

const screen = new THREE.Vector3();

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  return {
    sphere: new THREE.SphereGeometry(1, 24, 18),
    small: new THREE.SphereGeometry(1, 12, 10),
    limb: new THREE.CapsuleGeometry(1, 1, 4, 10),
    ring: new THREE.TorusGeometry(1, 0.3, 8, 18),
    hit: new THREE.BoxGeometry(1.4, 2.4, 1),
    skin: std('#f8cfae', { roughness: 0.55 }),
    hair: std('#3a2416', { roughness: 0.7 }),
    suit: std('#ff7eb6', { roughness: 0.45 }),
    ruffle: std('#ffc2dc'),
    flipper: std('#ffd23f', { roughness: 0.4 }),
    goggle: std('#4fd1ff', { roughness: 0.2, metalness: 0.2 }),
    lens: new THREE.MeshStandardMaterial({ color: '#bff3ff', roughness: 0.05, transparent: true, opacity: 0.6 }),
    eye: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    blush: new THREE.MeshBasicMaterial({ color: '#ff8fb1', transparent: true, opacity: 0.7, depthWrite: false }),
    lips: std('#e2476d'),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// Limb hanging down from a pivot (shoulder or hip).
function Limb({ kit, pivotRef, at, radius, length, mat, children }) {
  return (
    <group ref={pivotRef} position={at}>
      <mesh geometry={kit.limb} material={mat} position={[0, -length / 2 - radius, 0]} scale={[radius, length / 2, radius]} />
      {children}
    </group>
  );
}

// Asma: a friendly girl who dives in to visit the fish, holding her breath with puffed cheeks.
export default function AsmaDiver() {
  const kit = useMemo(makeKit, []);
  const root = useRef();
  const body = useRef();
  const armL = useRef();
  const armR = useRef();
  const legL = useRef();
  const legR = useRef();
  const tail = useRef();
  const cheeks = useRef();
  const lastX = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  useFrame(({ camera, size }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const event = updateAsma(dt);
    if (event) asmaEvent(event);

    const a = world.asma;
    const g = root.current;
    const label = labelEls.get('asma');
    g.visible = a.phase !== 'idle';
    if (!g.visible) {
      if (label) label.style.transform = 'translate3d(-999px,-999px,0)';
      return;
    }
    const t = world.time;
    const vx = (a.pos.x - lastX.current) / Math.max(dt, 1e-3);
    lastX.current = a.pos.x;
    const streamline = a.phase === 'playing' ? 0 : 1; // arms up while diving or surfacing

    g.position.copy(a.pos);
    g.position.y += Math.sin(t * 1.6) * 0.08 * (1 - streamline);
    const twirlTurn = a.twirl > 0 ? (1 - a.twirl / 0.9) * Math.PI * 2 : 0;
    g.rotation.set(0.12, THREE.MathUtils.clamp(vx * 0.25, -0.5, 0.5) + twirlTurn, -THREE.MathUtils.clamp(vx * 0.08, -0.15, 0.15));
    body.current.rotation.x = Math.sin(t * 1.6) * 0.05;

    // Breaststroke arms, flutter-kick legs, floating ponytail.
    const stroke = Math.sin(t * 2.2);
    const armOut = streamline ? 2.8 : 1.0 + stroke * 0.45;
    armL.current.rotation.set(streamline ? 0 : 0.3, 0, armOut);
    armR.current.rotation.set(streamline ? 0 : 0.3, 0, -armOut);
    const kick = Math.sin(t * 5) * 0.35;
    legL.current.rotation.x = kick;
    legR.current.rotation.x = -kick;
    tail.current.rotation.x = -0.9 + Math.sin(t * 1.3) * 0.15;
    tail.current.rotation.z = Math.sin(t * 0.9) * 0.2;

    // Puffed cheeks while holding her breath; they swell a little as air runs low.
    const puff = 1 + (1 - a.breath) * 0.25 + Math.sin(t * 3) * 0.03;
    cheeks.current.scale.setScalar(puff);

    // Pin her speech bubble above her head.
    if (label) {
      screen.copy(a.pos);
      screen.y += 2.0;
      screen.project(camera);
      const x = ((screen.x + 1) / 2) * size.width;
      const y = ((1 - screen.y) / 2) * size.height;
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });

  const onClick = (e) => {
    e.stopPropagation();
    petAsma();
  };

  return (
    <group ref={root} visible={false} scale={0.95}>
      <group ref={body}>
        {/* swimsuit */}
        <mesh geometry={kit.limb} material={kit.suit} position={[0, 0.38, 0]} scale={[0.3, 0.22, 0.24]} />
        <mesh geometry={kit.ring} material={kit.ruffle} position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.32, 0.27, 0.2]} />
        <mesh geometry={kit.small} material={kit.ruffle} position={[0, 0.48, 0.25]} scale={0.06} />
        <mesh geometry={kit.limb} material={kit.skin} position={[0, 0.74, 0]} scale={[0.1, 0.06, 0.1]} />

        {/* head */}
        <group position={[0, 1.12, 0]}>
          <mesh geometry={kit.sphere} material={kit.skin} scale={0.42} />
          <mesh geometry={kit.sphere} material={kit.hair} position={[0, 0.05, -0.09]} scale={[0.445, 0.44, 0.4]} />
          <mesh geometry={kit.sphere} material={kit.hair} position={[0, 0.28, 0.17]} scale={[0.36, 0.14, 0.24]} />
          {/* floating ponytail with a pink scrunchie */}
          <group ref={tail} position={[0, 0.3, -0.32]}>
            <mesh geometry={kit.ring} material={kit.suit} rotation={[Math.PI / 2, 0, 0]} scale={0.09} />
            <mesh geometry={kit.limb} material={kit.hair} position={[0, 0.28, 0]} scale={[0.11, 0.2, 0.11]} />
            <mesh geometry={kit.small} material={kit.hair} position={[0, 0.55, 0]} scale={[0.13, 0.12, 0.13]} />
          </group>
          {/* goggles pushed up on her forehead */}
          {[-0.15, 0.15].map((x) => (
            <group key={x} position={[x, 0.31, 0.4]} rotation={[-0.6, 0, 0]}>
              <mesh geometry={kit.ring} material={kit.goggle} scale={0.085} />
              <mesh geometry={kit.small} material={kit.lens} scale={[0.075, 0.075, 0.02]} />
            </group>
          ))}
          {/* sparkly eyes */}
          {[-0.15, 0.15].map((x) => (
            <group key={x} position={[x, 0.0, 0.37]}>
              <mesh geometry={kit.small} material={kit.eye} scale={[0.06, 0.075, 0.04]} />
              <mesh geometry={kit.small} material={kit.shine} position={[0.02, 0.03, 0.03]} scale={0.022} />
            </group>
          ))}
          {/* puffed, blushing cheeks and a little "o" mouth: she is holding her breath! */}
          <group ref={cheeks} position={[0, -0.13, 0.27]}>
            {[-0.19, 0.19].map((x) => (
              <group key={x}>
                <mesh geometry={kit.sphere} material={kit.skin} position={[x, 0, 0]} scale={0.13} />
                <mesh geometry={kit.small} material={kit.blush} position={[x * 1.05, 0.01, 0.11]} scale={[0.07, 0.05, 0.02]} />
              </group>
            ))}
          </group>
          <mesh geometry={kit.ring} material={kit.lips} position={[0, -0.2, 0.4]} scale={0.035} />
        </group>

        {/* arms with hands */}
        <Limb kit={kit} pivotRef={armL} at={[0.3, 0.62, 0]} radius={0.075} length={0.4} mat={kit.skin}>
          <mesh geometry={kit.small} material={kit.skin} position={[0, -0.57, 0]} scale={0.085} />
        </Limb>
        <Limb kit={kit} pivotRef={armR} at={[-0.3, 0.62, 0]} radius={0.075} length={0.4} mat={kit.skin}>
          <mesh geometry={kit.small} material={kit.skin} position={[0, -0.57, 0]} scale={0.085} />
        </Limb>

        {/* legs with yellow flippers */}
        <Limb kit={kit} pivotRef={legL} at={[0.13, 0.08, 0]} radius={0.09} length={0.5} mat={kit.skin}>
          <mesh geometry={kit.small} material={kit.flipper} position={[0, -0.72, 0.12]} scale={[0.13, 0.04, 0.3]} />
        </Limb>
        <Limb kit={kit} pivotRef={legR} at={[-0.13, 0.08, 0]} radius={0.09} length={0.5} mat={kit.skin}>
          <mesh geometry={kit.small} material={kit.flipper} position={[0, -0.72, 0.12]} scale={[0.13, 0.04, 0.3]} />
        </Limb>
      </group>
      <mesh
        geometry={kit.hit}
        material={kit.hidden}
        position={[0, 0.7, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
