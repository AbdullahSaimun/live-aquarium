import * as THREE from 'three';
import { tapWater } from '../state/store';

const backdropGeo = new THREE.PlaneGeometry(80, 40);
const hiddenMat = new THREE.MeshBasicMaterial({ visible: false });
const dropPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.6); // z = 0.6, mid-tank depth
const point = new THREE.Vector3();

// Invisible backdrop behind the whole tank: a tap on open water drops food at that spot.
// Fish and pellets sit in front of it, so tapping them still selects or drags them.
export default function WaterTap() {
  const onClick = (e) => {
    if (e.delta > 10) return; // a drag, not a tap
    e.stopPropagation();
    if (e.ray.intersectPlane(dropPlane, point)) tapWater(point);
  };
  return <mesh geometry={backdropGeo} material={hiddenMat} position={[0, 0, -8]} onClick={onClick} />;
}
