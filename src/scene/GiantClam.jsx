import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { showCreature, sfx, collectClamPearl } from '../state/store';
import { sharkActive } from '../sim/sharkBrain';
import { CLAM_SPOT, sandY } from './reefLayout';

const Y = sandY(CLAM_SPOT.x, CLAM_SPOT.z);
const SNAP_TIME = 2.6;
const HOME = new THREE.Vector3(CLAM_SPOT.x, Y, CLAM_SPOT.z);

// One half of the shell: a shallow dome with deep radial ridges and a wavy, scalloped edge.
function shellHalf() {
  const geo = new THREE.SphereGeometry(1, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const ridge = Math.abs(Math.sin(a * 3.5)); // 7 big folds around the rim
    const rim = 1 - y; // ridges grow towards the edge
    const r = 1 + ridge * 0.12 * rim;
    p.setXYZ(i, x * r, y * 0.42 + ridge * 0.1 * rim * rim, z * r * 0.72);
  }
  geo.computeVertexNormals();
  return geo;
}

// The soft mantle between the shells: blue and purple with little glowing spots.
function mantleMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0.15 });
  mat.onBeforeCompile = (shader) => {
    THREE.Material.prototype.onBeforeCompile.call(mat, shader); // shared underwater light
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMantleP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMantleP = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMantleP;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float band = 0.5 + 0.5 * sin(vMantleP.x * 9.0 + sin(vMantleP.z * 7.0) * 1.5);
        vec3 mantle = mix(vec3(0.16, 0.36, 0.86), vec3(0.5, 0.25, 0.8), band);
        vec2 cell = fract(vMantleP.xz * 6.0) - 0.5;
        float spot = 1.0 - smoothstep(0.08, 0.17, length(cell));
        mantle = mix(mantle, vec3(0.45, 1.0, 0.95), spot * 0.8);
        diffuseColor.rgb *= mantle;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;',
      );
  };
  mat.customProgramCacheKey = () => 'clam-mantle';
  return mat;
}

// A giant clam: breathes open and closed, puffs bubbles, and snaps shut when tapped or when the shark comes.
export default function GiantClam() {
  const kit = useMemo(
    () => ({
      shell: shellHalf(),
      mantle: new THREE.SphereGeometry(1, 32, 12),
      sphere: new THREE.SphereGeometry(1, 12, 8),
      shellMat: new THREE.MeshStandardMaterial({ color: '#d9cdb7', roughness: 0.75, side: THREE.DoubleSide }),
      lipMat: new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.5 }),
      pearlMat: new THREE.MeshStandardMaterial({ color: '#fbf6ff', roughness: 0.12, metalness: 0.15, emissive: '#f3e9ff', emissiveIntensity: 0.25 }),
      mantleMat: mantleMaterial(),
      hidden: new THREE.MeshBasicMaterial({ visible: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  const lid = useRef();
  const mantle = useRef();
  const pearl = useRef();
  const s = useRef({ open: 0.3, snap: 0, puff: 6 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    c.snap = Math.max(0, c.snap - dt);
    const sharkNear = sharkActive() && world.shark.pos.distanceTo(HOME) < 4.5;
    // Slow breathing; shut tight when tapped or when the shark is near.
    const target = c.snap > 0 || sharkNear ? 0.02 : 0.32 + Math.sin(t * 0.55) * 0.1;
    const speed = c.snap > SNAP_TIME - 0.3 || sharkNear ? 18 : 1.2;
    c.open += (target - c.open) * (1 - Math.exp(-dt * speed));
    lid.current.rotation.x = -c.open;
    mantle.current.scale.y = 0.08 + c.open * 0.35;
    kit.mantleMat.emissiveIntensity = 0.12 + (1 - world.light) * 0.9;
    // Now and then a pearl shines on the mantle while the clam is open.
    pearl.current.visible = world.clamPearl && c.open > 0.12;
    kit.pearlMat.emissiveIntensity = 0.25 + Math.max(0, Math.sin(t * 3)) * 0.45;
    pearl.current.scale.setScalar(0.15 + Math.sin(t * 3) * 0.008);

    c.puff -= dt;
    if (c.puff <= 0) {
      c.puff = 7 + Math.random() * 6;
      if (c.open > 0.25) queueEffect('bubbles', new THREE.Vector3(CLAM_SPOT.x, Y + 0.45, CLAM_SPOT.z + 0.1), 6);
    }
  });

  const onClick = (e) => {
    e.stopPropagation();
    // Tapping while a pearl shines collects the pearl instead of snapping shut.
    if (pearl.current.visible) {
      collectClamPearl(HOME.clone().setY(Y + 0.5));
      return;
    }
    s.current.snap = SNAP_TIME;
    sfx('clam');
    showCreature('giantClam');
  };

  return (
    <group position={[CLAM_SPOT.x, Y + 0.02, CLAM_SPOT.z]} rotation={[0, 0.35, 0]} scale={0.55}>
      {/* bottom shell, sunk a little into the sand */}
      <mesh geometry={kit.shell} material={kit.shellMat} rotation={[Math.PI, 0, 0]} position={[0, 0.12, 0]} />
      <mesh ref={mantle} geometry={kit.mantle} material={kit.mantleMat} position={[0, 0.12, 0.04]} scale={[0.9, 0.15, 0.62]} />
      <mesh ref={pearl} geometry={kit.sphere} material={kit.pearlMat} position={[0, 0.3, 0.18]} scale={0.15} visible={false} />
      {/* top shell, hinged at the back */}
      <group ref={lid} position={[0, 0.12, -0.7]}>
        <mesh geometry={kit.shell} material={kit.shellMat} position={[0, 0, 0.7]} />
      </group>
      <mesh
        geometry={kit.sphere}
        material={kit.hidden}
        position={[0, 0.25, 0]}
        scale={[1.2, 0.6, 0.9]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
