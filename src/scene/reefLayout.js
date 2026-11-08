// Shared layout for the seabed, so rocks, plants, critters and scattered pebbles all agree on where
// things are, sit exactly on the sand, and stay clear of the chest, the octopus den and the creatures.
import * as THREE from 'three';
import { world } from '../sim/world';

// The sand mesh is centred at z = -2 and lowered a little below the floor line.
export const SAND_Z = -2;
export const SAND_DROP = 0.15;

/** Height of the sand relief at a world (x, z), before the mesh's own offset. */
export function sandRelief(x, z) {
  const zl = z - SAND_Z;
  let h = Math.sin(x * 0.45) * 0.18 + Math.cos(zl * 0.6 + x * 0.2) * 0.14 + Math.max(0, -zl - 3) * 0.12;
  h += Math.exp(-((x * x) / 30 + ((z + 6) * (z + 6)) / 4)) * 0.35; // a soft mound behind the reef
  h -= Math.exp(-((x * x) / 8 + ((z - 1) * (z - 1)) / 3)) * 0.1; // a shallow dip in the front middle
  return h;
}

/** World y of the sand surface at (x, z). */
export const sandY = (x, z) => world.floorY - SAND_DROP + sandRelief(x, z);

/** Small deterministic random generator, so the scattered layout never changes between visits. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Natural boulders: [x, z, size, shape 0-3, turn]. A low wall along the back, a few at the edges and
// two small stones in front. Positions near the middle keep some rock visible on narrow phones.
export const ROCKS = [
  [-7.6, -4.6, 1.5, 0, 0.3],
  [-5.7, -5.5, 1.15, 1, 1.4],
  [-3.4, -6.0, 1.0, 2, 2.2],
  [-1.3, -6.4, 1.3, 3, 0.9],
  [1.6, -6.2, 1.1, 0, 2.8],
  [3.9, -5.7, 1.25, 2, 0.4],
  [6.6, -4.7, 1.6, 1, 1.9],
  [8.7, -5.9, 2.0, 3, 0.2],
  [-8.5, -1.7, 0.85, 2, 1.1],
  [8.3, -1.1, 0.8, 0, 2.5],
  [4.6, 0.85, 0.42, 1, 0.7],
  [-3.6, 1.35, 0.34, 3, 1.6],
];

// Where the new creatures live.
export const CLAM_SPOT = { x: -2.3, z: -1.7 };
export const EEL_SPOT = { x: 0.45, z: -0.35 };
export const AIR_STONE = { x: 2.9, z: -4.3 };

// Each decoration bought with pearls has its own spot: [x, z, keep-out radius, turn].
export const DECOR_SPOTS = {
  // Chosen by measuring against every coral, plant, rock and creature home, so nothing overlaps.
  fanCoral: [2.6, -3.2, 0.9, 0.1],
  anchor: [-6.3, 0.9, 0.7, 0.6],
  diver: [0.0, -2.8, 0.45, 0.3],
  castle: [6.9, -1.9, 0.75, -0.4],
  lanterns: [4.2, -3.1, 0.5, 0],
  volcano: [-3.6, -2.4, 0.7, 0],
  arch: [2.6, -0.2, 1.2, 0],
  shipwreck: [0.0, -9.1, 2.4, 0.25],
};

// Homes of creatures and decorations: plants may grow right up to rocks, but never here.
const HOME_SPOTS = [
  [-4.4, 0.6, 1.2], // treasure chest
  [-1.25, 0.6, 0.9], // where the chest sits on narrow phones
  [3.3, -1.8, 1.2], // octopus den
  [CLAM_SPOT.x, CLAM_SPOT.z, 0.9],
  [EEL_SPOT.x, EEL_SPOT.z, 0.9],
  [AIR_STONE.x, AIR_STONE.z, 0.4],
  ...Object.values(DECOR_SPOTS).map(([x, z, r]) => [x, z, r]),
];

// Circles [x, z, radius] that scattered pebbles, shells and plants keep out of.
export const KEEP_OUT = [...HOME_SPOTS, ...ROCKS.map(([x, z, s]) => [x, z, s * 0.9])];

export const isClear = (x, z, pad = 0) => KEEP_OUT.every(([kx, kz, r]) => Math.hypot(x - kx, z - kz) > r + pad);

// Plants may grow right up against rocks; they only keep out of the chest, den and creature homes.
export const isClearOfHomes = (x, z, pad = 0) => HOME_SPOTS.every(([kx, kz, r]) => Math.hypot(x - kx, z - kz) > r + pad);

// One clock for every swaying plant shader, ticked by Seabed.
export const reefTime = { value: 0 };
export const reefLight = { value: 1 };

/**
 * Makes a standard material sway gently in the current: vertices bend more the higher they are
 * (local y), with a phase taken from where the plant (or instance) stands.
 */
export function addSway(material, { amp = 0.12, speed = 1, height = 1 } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReefTime = reefTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uReefTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 swayAt = vec3(instanceMatrix[3]);
        #else
          vec3 swayAt = vec3(modelMatrix[3]);
        #endif
        float swayK = pow(clamp(position.y / ${height.toFixed(3)}, 0.0, 1.0), 1.6);
        float swayP = swayAt.x * 0.7 + swayAt.z * 0.45;
        transformed.x += (sin(uReefTime * ${(0.9 * speed).toFixed(3)} + swayP) + 0.35 * sin(uReefTime * ${(2.1 * speed).toFixed(3)} + swayP * 1.7)) * ${amp.toFixed(3)} * swayK;
        transformed.z += cos(uReefTime * ${(0.7 * speed).toFixed(3)} + swayP * 1.3) * ${(amp * 0.6).toFixed(3)} * swayK;`,
      );
  };
  material.customProgramCacheKey = () => `sway-${amp}-${speed}-${height}`;
  return material;
}

/** Puts a mesh's bottom at y = 0, so it can be placed straight onto sandY(). */
export function sitOnBase(geo) {
  geo.computeBoundingBox();
  geo.translate(0, -geo.boundingBox.min.y, 0);
  return geo;
}

export const tmpObj = new THREE.Object3D();
export const tmpColor = new THREE.Color();
