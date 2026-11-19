import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame, useThree } from '@react-three/fiber';
import { world } from '../sim/world';
import { WILD, createWild, createGroup, updateGroup, updateWild, startleWild } from '../sim/wildFish';
import { showCreature, sfx } from '../state/store';
import { tmpObj } from './reefLayout';

const SPHERE = new THREE.SphereGeometry(1, 12, 8);
const CONE = new THREE.ConeGeometry(1, 1, 6); // points up (+y)
const CONE_Z = CONE.clone().rotateX(Math.PI / 2); // points forward (+z): tails and snouts
const color = new THREE.Color();

// One coloured piece of a fish: scaled, turned, moved, and painted into its vertex colours.
function part(base, hex, s, r = [0, 0, 0], p = [0, 0, 0]) {
  const g = base.clone().toNonIndexed();
  g.scale(...s);
  g.rotateX(r[0]).rotateY(r[1]).rotateZ(r[2]);
  g.translate(...p);
  color.set(hex); // already converted to linear by three's colour management
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) color.toArray(c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
const eyes = (x, y, z, s = 0.014) => [part(SPHERE, '#0e141c', [s, s, s], undefined, [x, y, z]), part(SPHERE, '#0e141c', [s, s, s], undefined, [-x, y, z])];

// Each species, facing +z. Small and simple, but with the colours and shapes that make them recognisable.
const BUILD = {
  chromis: () => [
    part(SPHERE, '#3cc4d4', [0.045, 0.07, 0.15]),
    part(CONE_Z, '#2aa0b8', [0.008, 0.075, 0.1], undefined, [0, 0, -0.19]),
    part(CONE, '#56d8d2', [0.006, 0.05, 0.1], undefined, [0, 0.07, -0.01]),
    ...eyes(0.034, 0.02, 0.095),
  ],
  anthias: () => [
    part(SPHERE, '#ff8a65', [0.04, 0.065, 0.15]),
    part(CONE_Z, '#ff5d8f', [0.008, 0.085, 0.11], undefined, [0, 0, -0.2]),
    part(CONE, '#ffb199', [0.006, 0.06, 0.1], undefined, [0, 0.065, 0]),
    part(SPHERE, '#b57bff', [0.042, 0.008, 0.05], undefined, [0, -0.008, 0.085]),
    ...eyes(0.03, 0.02, 0.1),
  ],
  butterflyfish: () => [
    part(SPHERE, '#ffd23f', [0.03, 0.12, 0.13]),
    part(SPHERE, '#fff6dc', [0.031, 0.1, 0.06], undefined, [0, 0, 0.07]),
    part(SPHERE, '#222222', [0.033, 0.11, 0.015], undefined, [0, 0.01, 0.085]),
    part(CONE_Z, '#ffd23f', [0.012, 0.012, 0.06], undefined, [0, -0.01, 0.15]),
    part(CONE_Z, '#ffd23f', [0.006, 0.06, 0.06], undefined, [0, 0, -0.15]),
    part(SPHERE, '#222222', [0.032, 0.02, 0.02], undefined, [0, 0.03, -0.075]),
    ...eyes(0.022, 0.02, 0.09, 0.012),
  ],
  moorishIdol: () => [
    part(SPHERE, '#f6f6f2', [0.028, 0.14, 0.14]),
    part(SPHERE, '#1d1d1d', [0.03, 0.145, 0.035], undefined, [0, 0, 0.05]),
    part(SPHERE, '#1d1d1d', [0.03, 0.13, 0.035], undefined, [0, 0, -0.07]),
    part(SPHERE, '#ffd23f', [0.029, 0.06, 0.05], undefined, [0, 0.06, -0.01]),
    part(CONE_Z, '#ff9f40', [0.012, 0.012, 0.08], undefined, [0, -0.02, 0.16]),
    part(CONE, '#ffffff', [0.004, 0.34, 0.03], [-0.7, 0, 0], [0, 0.24, -0.09]),
    part(CONE_Z, '#1d1d1d', [0.005, 0.06, 0.07], undefined, [0, 0, -0.17]),
    ...eyes(0.022, 0.03, 0.09, 0.012),
  ],
  royalGramma: () => [
    part(SPHERE, '#ffd400', [0.035, 0.055, 0.13]),
    part(SPHERE, '#8f3dff', [0.037, 0.058, 0.075], undefined, [0, 0, 0.06]),
    part(CONE_Z, '#ffd400', [0.006, 0.06, 0.07], undefined, [0, 0, -0.16]),
    ...eyes(0.03, 0.015, 0.09, 0.012),
  ],
  cardinalfish: () => [
    part(SPHERE, '#e7e9ec', [0.028, 0.08, 0.11]),
    part(SPHERE, '#151515', [0.03, 0.085, 0.015], undefined, [0, 0, 0.045]),
    part(SPHERE, '#151515', [0.03, 0.08, 0.015], undefined, [0, 0, -0.02]),
    part(CONE, '#151515', [0.004, 0.12, 0.04], [-0.3, 0, 0], [0, 0.11, 0]),
    part(CONE, '#151515', [0.004, 0.1, 0.04], [Math.PI + 0.3, 0, 0], [0, -0.1, -0.01]),
    part(CONE_Z, '#cfd2d6', [0.005, 0.08, 0.08], undefined, [0, 0, -0.13]),
    ...eyes(0.022, 0.02, 0.07, 0.011),
  ],
};

function buildKit(id, def) {
  const parts = BUILD[id]();
  const geo = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  const max = Math.ceil(def.base * 1.8) + 2;
  const swim = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);
  swim.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aSwim', swim);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.08 });
  // The tail sweeps and the body bends a little, more towards the back: a fish, not a toy.
  mat.onBeforeCompile = (shader) => {
    THREE.Material.prototype.onBeforeCompile.call(mat, shader); // shared underwater light
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aSwim;').replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float swimK = clamp(-position.z / ${def.len.toFixed(3)} + 0.3, 0.0, 2.2);
      transformed.x += sin(aSwim.x - position.z * 14.0) * aSwim.y * swimK * swimK * ${(def.len * 0.35).toFixed(3)};`,
    );
  };
  mat.customProgramCacheKey = () => `wild-${id}`;
  // A bigger invisible shape to tap: these fish are small.
  const r = Math.max(0.24, def.len * 1.8);
  const hitGeo = new THREE.SphereGeometry(r, 6, 4);
  return { id, def, geo, mat, max, swim, hitGeo };
}

const hitMat = new THREE.MeshBasicMaterial({ visible: false });

function Species({ kit, detail }) {
  const { camera, size } = useThree();
  const mesh = useRef();
  const hit = useRef();
  const list = useRef([]);
  const group = useMemo(createGroup, []);

  useLayoutEffect(() => {
    // The tap shape moves with the fish: both share one set of instance positions.
    hit.current.instanceMatrix = mesh.current.instanceMatrix;
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const { def, max, swim } = kit;
    // How far the picture reaches left and right at depth z, beside the button rail.
    const aspect = size.width / size.height;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const free = 1 - Math.min(world.viewInset || 0, size.width * 0.4) / size.width;
    const xMax = (z) => Math.max(1.2, (camera.position.z - z) * tanH * aspect * free - 0.45);

    // Wider screens get more fish; phones and calm mode fewer.
    const wide = THREE.MathUtils.clamp(xMax(0) / 6.2, 0.45, 1.7) * (detail === 'low' ? 0.6 : 1);
    let want = Math.min(max, Math.max(1, Math.round(def.base * wide)));
    if (def.style === 'pair') want = Math.max(2, want - (want % 2));
    const fish = list.current;
    const staying = fish.filter((f) => !f.leaving).length;
    if (staying < want && fish.length < max) {
      const first = fish.length === 0;
      // The first fish are simply there; later ones swim in from the sides.
      const n = first ? want : 1;
      for (let k = 0; k < n; k++) fish.push(createWild(def, xMax, first ? 0 : Math.random() < 0.5 ? -1 : 1));
    } else if (staying > want) {
      for (let k = fish.length - 1; k >= 0; k--)
        if (!fish[k].leaving) {
          fish[k].leaving = true;
          break;
        }
    }

    updateGroup(group, def, xMax, dt);
    for (let i = fish.length - 1; i >= 0; i--) if (fish[i].gone) fish.splice(i, 1);
    const m = mesh.current;
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      updateWild(f, i, fish, def, group, xMax, dt);
      tmpObj.position.copy(f.pos);
      tmpObj.rotation.set(f.pitch, f.yaw, f.bank, 'YXZ');
      tmpObj.scale.setScalar(f.size);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
      swim.array[i * 2] = f.phase;
      swim.array[i * 2 + 1] = f.amp;
    }
    m.count = fish.length;
    hit.current.count = fish.length;
    hit.current.boundingSphere = null; // fish move: tap tests must use today's positions
    m.instanceMatrix.needsUpdate = true;
    swim.needsUpdate = true;
  });

  const onClick = (e) => {
    e.stopPropagation();
    const f = list.current[e.instanceId];
    if (f) startleWild(f, e.point);
    sfx('chime');
    showCreature(kit.id);
  };

  return (
    <>
      <instancedMesh ref={mesh} args={[kit.geo, kit.mat, kit.max]} frustumCulled={false} />
      <instancedMesh ref={hit} args={[kit.hitGeo, hitMat, kit.max]} frustumCulled={false} onClick={onClick} />
    </>
  );
}

// The wild reef community: six species that fill the tank, more of them on wider screens.
export default function WildFish({ detail }) {
  const kits = useMemo(() => Object.entries(WILD).map(([id, def]) => buildKit(id, def)), []);
  useEffect(
    () => () =>
      kits.forEach((k) => {
        k.geo.dispose();
        k.mat.dispose();
        k.hitGeo.dispose();
      }),
    [kits],
  );
  return kits.map((k) => <Species key={k.id} kit={k} detail={detail} />);
}
