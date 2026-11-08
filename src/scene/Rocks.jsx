import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ROCKS, sandY, seeded } from './reefLayout';

// Natural boulders: a noisy, lumpy ball with a flattened base, in four different shapes.
function makeRock(seed) {
  const rnd = seeded(seed);
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  const bumps = Array.from({ length: 6 }, () => [
    new THREE.Vector3(rnd() * 2 - 1, rnd() * 1.4 - 0.4, rnd() * 2 - 1).normalize(),
    0.12 + rnd() * 0.22,
  ]);
  const f1 = 2 + rnd() * 2;
  const f2 = 5 + rnd() * 3;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let r = 1;
    for (const [dir, amt] of bumps) r += Math.max(0, v.dot(dir) - 0.55) * amt * 2.2;
    r += Math.sin(v.x * f1 + v.z * 1.3) * Math.cos(v.y * f1) * 0.07;
    r += Math.sin(v.x * f2 + seed) * Math.sin(v.y * f2) * Math.sin(v.z * f2) * 0.035;
    v.multiplyScalar(r);
    if (v.y < -0.25) v.y = -0.25 + (v.y + 0.25) * 0.25; // flat bottom settles into the sand
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Grey-brown stone with green moss on the surfaces that face up and pink coralline crust patches.
export function makeRockMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRockN;\nvarying vec3 vRockP;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvRockN = normalize(mat3(modelMatrix) * objectNormal);\nvRockP = (modelMatrix * vec4(position, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vRockN;
        varying vec3 vRockP;
        float rockHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float rockNoise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(rockHash(i), rockHash(i + vec3(1,0,0)), f.x), mix(rockHash(i + vec3(0,1,0)), rockHash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(rockHash(i + vec3(0,0,1)), rockHash(i + vec3(1,0,1)), f.x), mix(rockHash(i + vec3(0,1,1)), rockHash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float n1 = rockNoise(vRockP * 2.2);
        float n2 = rockNoise(vRockP * 5.5 + 7.0);
        float n3 = rockNoise(vRockP * 1.3 + 3.0);
        vec3 stone = mix(vec3(0.4, 0.37, 0.34), vec3(0.58, 0.53, 0.46), n1);
        stone *= 0.85 + 0.3 * n2;
        float moss = smoothstep(0.15, 0.6, vRockN.y + (n2 - 0.5) * 0.6 + (n3 - 0.5) * 0.4);
        vec3 mossCol = mix(vec3(0.22, 0.48, 0.13), vec3(0.42, 0.66, 0.2), n2);
        float crust = smoothstep(0.62, 0.72, n3) * (1.0 - moss) * smoothstep(-0.4, 0.2, vRockN.y);
        vec3 col = mix(stone, mossCol, moss);
        col = mix(col, vec3(0.93, 0.55, 0.62), crust * 0.85);
        diffuseColor.rgb *= col;`,
      );
  };
  mat.customProgramCacheKey = () => 'mossy-rock';
  return mat;
}

// The rock wall at the back and the boulders at the edges (the octopus keeps its own den rock).
export default function Rocks() {
  const geos = useMemo(() => [11, 23, 37, 51].map(makeRock), []);
  const mat = useMemo(makeRockMaterial, []);
  useEffect(
    () => () => {
      geos.forEach((g) => g.dispose());
      mat.dispose();
    },
    [geos, mat],
  );
  return (
    <group>
      {ROCKS.map(([x, z, s, shape, turn], i) => (
        <mesh
          key={i}
          geometry={geos[shape]}
          material={mat}
          position={[x, sandY(x, z) + s * 0.12, z]}
          rotation={[0, turn, 0]}
          scale={[s * 1.25, s * 0.85, s]}
        />
      ))}
    </group>
  );
}
