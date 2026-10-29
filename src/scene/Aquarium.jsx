import { useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useStore, selectFish } from '../state/store';
import { world } from '../sim/world';
import Seabed from './Seabed';
import Coral from './Coral';
import Plants from './Plants';
import Bubbles from './Bubbles';
import School from './School';
import FoodPellets from './FoodPellets';
import Hearts from './Hearts';
import AsmaDiver from './AsmaDiver';
import WaterTap from './WaterTap';
import TreasureChest from './TreasureChest';

const FOV = 45;
const BASE_Z = 11;

// Fits the tank to the screen and adds a gentle pointer parallax. Portrait screens pull the
// camera back a little, narrow the swim area and let fish use the extra height instead.
function CameraRig({ calm }) {
  const { camera, size } = useThree();
  const aspect = size.width / size.height;
  const camZ = aspect < 1 ? BASE_Z + (1 - aspect) * 5.5 : BASE_Z;

  useEffect(() => {
    const halfH = camZ * Math.tan((FOV / 2) * (Math.PI / 180));
    const halfW = halfH * aspect;
    const maxX = Math.max(1.4, Math.min(6.5, halfW - 0.7));
    world.bounds.minX = -maxX;
    world.bounds.maxX = maxX;
    world.bounds.maxY = aspect < 0.8 ? 2.3 : 1.6;
  }, [aspect, camZ]);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 2);
    const px = calm ? 0 : state.pointer.x * 0.6;
    const py = calm ? 0 : state.pointer.y * 0.3;
    camera.position.x += (px - camera.position.x) * k;
    camera.position.y += (0.4 + py - camera.position.y) * k;
    camera.position.z += (camZ - camera.position.z) * k;
    camera.lookAt(0, -0.2, 0);
  });
  return null;
}

export default function Aquarium() {
  const calm = useStore((s) => s.settings.calmMode);
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1));

  return (
    <Canvas
      className="aquarium-canvas"
      dpr={dpr}
      camera={{ position: [0, 0.4, BASE_Z], fov: FOV, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      onPointerMissed={() => selectFish(null)}
    >
      {/* Drop resolution on slow devices, restore it when frames are smooth again. */}
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(Math.min(1.5, window.devicePixelRatio || 1))}
      />
      <fog attach="fog" args={['#3a9bd0', 14, 32]} />
      <hemisphereLight args={['#bff3ff', '#f2c98c', 1.4]} />
      <directionalLight position={[3, 10, 6]} intensity={1.6} color="#fffaf0" />
      <ambientLight intensity={0.35} />

      <CameraRig calm={calm} />
      <WaterTap />
      <Seabed />
      <Coral />
      <TreasureChest />
      <Plants calm={calm} />
      <Bubbles ambient={calm ? 18 : 45} />
      <School />
      <FoodPellets />
      <Hearts />
      <AsmaDiver />
    </Canvas>
  );
}
