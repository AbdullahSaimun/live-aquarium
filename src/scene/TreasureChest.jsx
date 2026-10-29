import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { openChest, CHEST_OPEN_TIME } from '../state/store';

const HOME_X = -4.4;
const Z = 0.6;
const sparkPos = new THREE.Vector3();

function makeParts() {
  const lidShape = new THREE.CylinderGeometry(0.42, 0.42, 1.2, 16, 1, false, 0, Math.PI);
  lidShape.rotateZ(Math.PI / 2); // half-cylinder dome lying along x
  return {
    box: new THREE.BoxGeometry(1.2, 0.6, 0.84),
    lid: lidShape,
    band: new THREE.BoxGeometry(0.12, 0.62, 0.88),
    lock: new THREE.BoxGeometry(0.18, 0.22, 0.06),
    coin: new THREE.CylinderGeometry(0.12, 0.12, 0.03, 14),
    hit: new THREE.BoxGeometry(1.6, 1.4, 1.2),
    wood: new THREE.MeshStandardMaterial({ color: '#a8643a', roughness: 0.8 }),
    gold: new THREE.MeshStandardMaterial({ color: '#ffcf4d', roughness: 0.35, metalness: 0.6, emissive: '#7a5200', emissiveIntensity: 0.25 }),
    glow: new THREE.MeshBasicMaterial({ color: '#fff3a6', transparent: true, opacity: 0, depthWrite: false }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// Tappable treasure chest on the sand: opens with a jingle, bubbles and a surprise fact.
export default function TreasureChest() {
  const p = useMemo(makeParts, []);
  const group = useRef();
  const lid = useRef();
  const coins = useRef();
  const openFor = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(
    () => () => Object.values(p).forEach((x) => x.dispose()),
    [p],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    // Stay on screen when portrait phones narrow the tank.
    group.current.position.x = Math.max(HOME_X, world.bounds.minX + 0.4);
    openFor.current = Math.max(0, openFor.current - dt);
    const open = openFor.current > 0.6 ? 1 : openFor.current / 0.6;
    const target = -1.9 * open;
    lid.current.rotation.x += (target - lid.current.rotation.x) * (1 - Math.exp(-dt * 8));
    coins.current.position.y = 0.25 + open * (0.25 + Math.sin(world.time * 6) * 0.04);
    coins.current.rotation.y += dt * 2;
    p.glow.opacity = open * (0.45 + Math.sin(world.time * 8) * 0.15);
  });

  const onClick = (e) => {
    e.stopPropagation();
    sparkPos.setFromMatrixPosition(group.current.matrixWorld);
    sparkPos.y += 0.6;
    if (openChest(sparkPos)) openFor.current = CHEST_OPEN_TIME;
  };

  return (
    <group ref={group} position={[HOME_X, world.floorY + 0.3, Z]} rotation={[0, 0.35, 0]} scale={1.1}>
      <mesh geometry={p.box} material={p.wood} />
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} geometry={p.band} material={p.gold} position={[x, 0, 0]} />
      ))}
      <mesh geometry={p.lock} material={p.gold} position={[0, 0.12, 0.44]} />
      <group ref={coins}>
        <mesh geometry={p.coin} material={p.gold} position={[-0.2, 0, 0]} rotation={[0.3, 0, 0.2]} />
        <mesh geometry={p.coin} material={p.gold} position={[0.15, 0.05, 0.05]} rotation={[-0.4, 0, -0.3]} />
        <mesh geometry={p.coin} material={p.gold} position={[0, 0.12, -0.1]} rotation={[1.2, 0, 0]} />
        <mesh geometry={p.box} material={p.glow} scale={[0.8, 0.5, 0.8]} position={[0, -0.05, 0]} />
      </group>
      {/* Lid hinges at the back top edge. */}
      <group ref={lid} position={[0, 0.3, -0.42]}>
        <group position={[0, 0, 0.42]}>
          <mesh geometry={p.lid} material={p.wood} />
          {[-0.4, 0.4].map((x) => (
            <mesh key={x} geometry={p.lid} material={p.gold} position={[x, 0, 0]} scale={[0.1, 1.03, 1.03]} />
          ))}
        </group>
      </group>
      <mesh
        geometry={p.hit}
        material={p.hidden}
        position={[0, 0.3, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
