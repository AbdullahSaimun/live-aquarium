import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { showCreature, sfx } from '../state/store';
import { sharkActive } from '../sim/sharkBrain';
import { reefTime } from './reefLayout';

const HOME = { x: -5.2, y: world.floorY + 1.5, z: -1.7 };
const SHOW_TIME = 3;

// Living skin: dark bands of colour roll across it like passing clouds, and during a light show
// it flashes through the rainbow. `uShow` (0..1) blends towards the rainbow.
function skinMaterial(uShow) {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uReefTime = reefTime;
    shader.uniforms.uShow = uShow;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkin;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkin = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkin;\nuniform float uReefTime;\nuniform float uShow;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float wave = sin(vSkin.z * 18.0 - uReefTime * 3.0 + sin(vSkin.x * 14.0) * 1.2);
        vec3 base = mix(vec3(0.62, 0.45, 0.36), vec3(0.85, 0.7, 0.55), 0.5 + 0.5 * sin(vSkin.x * 30.0) * sin(vSkin.z * 26.0));
        vec3 calm = mix(base, base * vec3(0.45, 0.35, 0.4), smoothstep(0.3, 0.9, wave));
        float h = fract(vSkin.z * 2.5 - uReefTime * 1.4);
        vec3 rainbow = 0.55 + 0.45 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67)));
        diffuseColor.rgb *= mix(calm, rainbow, uShow);`,
      );
  };
  mat.customProgramCacheKey = () => 'cuttle-skin';
  return mat;
}

// A cuttlefish hovering at the left: its fin skirt ripples, colour clouds roll over its skin, and
// tapping it starts a rainbow light show. It darts away from the shark.
export default function Cuttlefish({ calm }) {
  const show = useMemo(() => ({ value: 0 }), []);
  const kit = useMemo(() => {
    const skirt = new THREE.CircleGeometry(1, 48);
    skirt.rotateX(-Math.PI / 2);
    return {
      sphere: new THREE.SphereGeometry(1, 24, 16),
      small: new THREE.SphereGeometry(1, 10, 8),
      skirt,
      arm: new THREE.CapsuleGeometry(0.018, 0.16, 3, 6),
      skin: skinMaterial(show),
      fin: new THREE.MeshStandardMaterial({ color: '#e9d6c6', roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }),
      white: new THREE.MeshStandardMaterial({ color: '#fff8e8', roughness: 0.2 }),
      pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
      hidden: new THREE.MeshBasicMaterial({ visible: false }),
    };
  }, [show]);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  const root = useRef();
  const skirt = useRef();
  const arms = useRef([]);
  const s = useRef({ x: HOME.x, y: HOME.y, z: HOME.z, show: 0, flee: 0, dir: 1 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  // Ripple the fin skirt's edge as a moving wave.
  const skirtBase = useMemo(() => Float32Array.from(kit.skirt.attributes.position.array), [kit]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    c.show = Math.max(0, c.show - dt);
    show.value = c.show > 0 ? Math.min(1, c.show, (SHOW_TIME - c.show) * 3) : 0;

    // Hover and drift slowly; dart backwards if the shark comes near.
    const b = world.bounds;
    const hx = THREE.MathUtils.clamp(HOME.x, b.minX + 0.6, b.maxX - 0.6);
    if (sharkActive() && world.shark.pos.distanceTo(root.current.position) < 3.5) c.flee = 1.5;
    c.flee = Math.max(0, c.flee - dt);
    const tx = hx + Math.sin(t * 0.13) * 0.6 - c.flee * 0.6;
    c.x += (tx - c.x) * (1 - Math.exp(-dt * (c.flee > 0 ? 3 : 0.6)));
    c.y = HOME.y + Math.sin(t * 0.7) * 0.12;
    root.current.position.set(c.x, c.y, c.z);
    root.current.rotation.y = Math.PI / 2 + Math.sin(t * 0.13) * 0.25;

    const p = kit.skirt.attributes.position;
    const amp = calm ? 0.015 : 0.035;
    for (let i = 0; i < p.count; i++) {
      const x = skirtBase[i * 3];
      const z = skirtBase[i * 3 + 2];
      const edge = Math.hypot(x, z);
      p.setY(i, Math.sin(Math.atan2(z, x) * 7 - t * 7) * amp * edge * edge);
    }
    p.needsUpdate = true;

    arms.current.forEach((a, i) => a && (a.rotation.x = 1.45 + Math.sin(t * 2 + i) * 0.12));
  });

  const onClick = (e) => {
    e.stopPropagation();
    s.current.show = SHOW_TIME;
    sfx('chime');
    showCreature('cuttlefish');
  };

  return (
    <group ref={root}>
      {/* body points along +z (the head end) */}
      <mesh geometry={kit.sphere} material={kit.skin} scale={[0.17, 0.13, 0.36]} />
      <mesh ref={skirt} geometry={kit.skirt} material={kit.fin} scale={[0.23, 1, 0.4]} />
      <group position={[0, 0.01, 0.34]}>
        <mesh geometry={kit.sphere} material={kit.skin} scale={[0.13, 0.11, 0.11]} />
        {[1, -1].map((side) => (
          <group key={side} position={[side * 0.1, 0.04, 0.02]}>
            <mesh geometry={kit.small} material={kit.white} scale={0.045} />
            <mesh geometry={kit.small} material={kit.pupil} position={[side * 0.02, 0, 0.025]} scale={[0.02, 0.03, 0.02]} />
          </group>
        ))}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <group key={i} ref={(el) => (arms.current[i] = el)} position={[Math.cos(a) * 0.05, Math.sin(a) * 0.04 - 0.02, 0.08]}>
              <mesh geometry={kit.arm} material={kit.skin} position={[0, 0.09, 0]} />
            </group>
          );
        })}
      </group>
      <mesh
        geometry={kit.sphere}
        material={kit.hidden}
        scale={[0.35, 0.3, 0.6]}
        position={[0, 0, 0.1]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
