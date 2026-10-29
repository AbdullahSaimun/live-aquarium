import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, removePellet, queueEffect, MAX_PELLETS } from '../sim/world';

const pelletGeo = new THREE.IcosahedronGeometry(0.11, 1);
const hitGeo = new THREE.SphereGeometry(0.45, 8, 6);
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const plane = new THREE.Plane();
const hitPoint = new THREE.Vector3();

const REST_TIME = 16; // seconds a pellet lies on the sand before dissolving

function Pellet({ pellet }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, 'grab');
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d9822b', roughness: 0.7, emissive: '#5a2a00', transparent: true }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const g = ref.current;
    if (!pellet.active) {
      if (g.visible) {
        g.visible = false;
        g.position.set(0, -100, 0); // also park it out of reach of pointer raycasts
      }
      return;
    }
    g.visible = true;
    pellet.age += dt;

    if (!pellet.dragging) {
      const floor = world.floorY + 0.1;
      if (pellet.pos.y > floor) {
        // Sink with water drag and a lazy side-to-side drift.
        pellet.vel.y += (-0.55 - pellet.vel.y) * Math.min(1, dt * 2);
        pellet.vel.x = Math.sin(world.time * 1.5 + pellet.spin * 3) * 0.18;
        pellet.pos.addScaledVector(pellet.vel, dt);
        if (pellet.pos.y <= floor) pellet.pos.y = floor;
      } else {
        pellet.resting += dt;
        if (pellet.resting > REST_TIME) {
          removePellet(pellet);
          return;
        }
      }
    }

    g.position.copy(pellet.pos);
    pellet.spin += dt * 1.2;
    g.rotation.set(pellet.spin, pellet.spin * 0.7, 0);
    const pinged = world.time - pellet.ping < 0.6 ? 1 + Math.sin((world.time - pellet.ping) * 20) * 0.3 : 1;
    const fade = pellet.resting > REST_TIME - 3 ? (REST_TIME - pellet.resting) / 3 : 1;
    g.scale.setScalar(pinged * Math.max(0.2, fade));
    mat.opacity = Math.max(0, fade);
  });

  const onDown = (e) => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    pellet.dragging = true;
    pellet.ping = world.time;
    plane.set(new THREE.Vector3(0, 0, 1), -pellet.pos.z);
    queueEffect('bubbles', pellet.pos, 3);
  };
  const onMove = (e) => {
    if (!pellet.dragging) return;
    e.stopPropagation();
    if (e.ray.intersectPlane(plane, hitPoint)) {
      const b = world.bounds;
      pellet.pos.set(
        THREE.MathUtils.clamp(hitPoint.x, b.minX - 0.5, b.maxX + 0.5),
        THREE.MathUtils.clamp(hitPoint.y, world.floorY + 0.1, world.surfaceY),
        pellet.pos.z,
      );
      pellet.resting = 0;
      pellet.vel.set(0, 0, 0);
    }
  };
  const onUp = (e) => {
    if (!pellet.dragging) return;
    e.stopPropagation();
    e.target.releasePointerCapture(e.pointerId);
    pellet.dragging = false;
    pellet.ping = world.time; // fish nearby notice the food that was just moved or tapped
  };

  return (
    <group ref={ref} visible={false}>
      <mesh geometry={pelletGeo} material={mat} />
      <mesh
        geometry={hitGeo}
        material={hitMat}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}

export default function FoodPellets() {
  return world.pellets.slice(0, MAX_PELLETS).map((p) => <Pellet key={p.index} pellet={p} />);
}
