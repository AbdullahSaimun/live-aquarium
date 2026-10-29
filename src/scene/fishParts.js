import * as THREE from 'three';

// Shared, app-lifetime geometries and materials for every fish (built once, reused by all).

function finGeometry(draw) {
  const shape = new THREE.Shape();
  draw(shape);
  const geo = new THREE.ShapeGeometry(shape, 10);
  // Shape is drawn in XY with +x pointing backwards along the body; turn it into the fish's YZ plane.
  geo.rotateY(Math.PI / 2);
  return geo;
}

export const sphereGeo = new THREE.SphereGeometry(1, 22, 16);
export const smallSphereGeo = new THREE.SphereGeometry(1, 12, 10);

export const TAILS = {
  round: finGeometry((s) => {
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.25, 0.48, 0.62, 0.42);
    s.quadraticCurveTo(0.78, 0, 0.62, -0.42);
    s.quadraticCurveTo(0.25, -0.48, 0, 0);
  }),
  fork: finGeometry((s) => {
    s.moveTo(0, 0.05);
    s.quadraticCurveTo(0.35, 0.3, 0.68, 0.62);
    s.quadraticCurveTo(0.5, 0, 0.68, -0.62);
    s.quadraticCurveTo(0.35, -0.3, 0, -0.05);
  }),
  fan: finGeometry((s) => {
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.45, 0.75, 0.78, 0.62);
    s.quadraticCurveTo(0.95, 0, 0.78, -0.62);
    s.quadraticCurveTo(0.45, -0.75, 0, 0);
  }),
  flowy: finGeometry((s) => {
    s.moveTo(0, 0.08);
    s.bezierCurveTo(0.4, 0.5, 0.9, 1.05, 1.3, 0.75);
    s.quadraticCurveTo(1.15, 0, 1.3, -0.75);
    s.bezierCurveTo(0.9, -1.05, 0.4, -0.5, 0, -0.08);
  }),
};

export const DORSALS = {
  round: finGeometry((s) => {
    s.moveTo(-0.35, 0);
    s.quadraticCurveTo(0, 0.38, 0.38, 0.06);
    s.lineTo(0.42, -0.05);
    s.lineTo(-0.35, -0.05);
  }),
  long: finGeometry((s) => {
    s.moveTo(-0.55, 0);
    s.quadraticCurveTo(-0.1, 0.32, 0.6, 0.18);
    s.lineTo(0.66, -0.05);
    s.lineTo(-0.55, -0.05);
  }),
  tall: finGeometry((s) => {
    s.moveTo(-0.35, 0);
    s.quadraticCurveTo(0.05, 0.6, 0.55, 0.14);
    s.lineTo(0.55, -0.05);
    s.lineTo(-0.35, -0.05);
  }),
  sail: finGeometry((s) => {
    s.moveTo(-0.2, 0);
    s.quadraticCurveTo(0.15, 0.7, 0.75, 1.0);
    s.quadraticCurveTo(0.5, 0.35, 0.45, -0.05);
    s.lineTo(-0.2, -0.05);
  }),
  flowy: finGeometry((s) => {
    s.moveTo(-0.15, 0);
    s.quadraticCurveTo(0.3, 0.65, 0.85, 0.4);
    s.quadraticCurveTo(0.6, 0.1, 0.5, -0.05);
    s.lineTo(-0.15, -0.05);
  }),
};

export const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
export const pupilMat = new THREE.MeshBasicMaterial({ color: '#1d1b33' });
export const shineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
export const blushMat = new THREE.MeshBasicMaterial({ color: '#ff8fb1', transparent: true, opacity: 0.55, depthWrite: false });
export const hitMat = new THREE.MeshBasicMaterial({ visible: false });

export function createFishMaterials() {
  return {
    body: new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }),
    fin: new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.88 }),
    accent: new THREE.MeshStandardMaterial({ roughness: 0.5 }),
  };
}

const PALE = new THREE.Color('#9aa3b5');

// Starving fish lose their colour: blend towards grey as health drops.
export function applyPalette(mats, palette, health = 1) {
  const fade = (1 - Math.min(1, health)) * 0.65;
  mats.body.color.set(palette.body).lerp(PALE, fade);
  mats.body.emissive.copy(mats.body.color).multiplyScalar(0.12);
  mats.fin.color.set(palette.fin).lerp(PALE, fade);
  mats.accent.color.set(palette.accent).lerp(PALE, fade * 0.5);
}

export function disposeFishMaterials(mats) {
  Object.values(mats).forEach((m) => m.dispose());
}
