import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useStore, selectFish, getState } from '../state/store';
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
import Shark from './Shark';
import Turtle from './Turtle';
import Crab from './Crab';
import Starfish from './Starfish';
import Octopus from './Octopus';
import Jellyfish from './Jellyfish';
import Seahorse from './Seahorse';
import Shrimp from './Shrimp';
import Lobster from './Lobster';
import Visitors from './Visitors';
import DayNight from './DayNight';
import SeaSnow from './SeaSnow';
import Balloons from './Balloons';
import Rocks from './Rocks';
import SeabedScatter from './SeabedScatter';
import Algae from './Algae';
import Critters from './Critters';
import GiantClam from './GiantClam';
import GardenEels from './GardenEels';
import FishSchool from './FishSchool';
import WaterSurface from './WaterSurface';
import Decorations from './Decorations';
import HermitCrab from './HermitCrab';
import Cuttlefish from './Cuttlefish';
import Nudibranchs from './Nudibranchs';
import Stingray from './Stingray';
import MorayEel from './MorayEel';
import NightLife from './NightLife';

const FOV = 45;
const BASE_Z = 11;

// Fits the tank to the screen and adds a gentle pointer parallax. Portrait screens pull the
// camera back a little, narrow the swim area and let fish use the extra height instead.
// The button rail on the left covers `world.viewInset` pixels: the picture is shifted right by half
// of that, so the tank is centred in the free space and no fish swims behind the buttons.
function CameraRig({ calm }) {
  const { camera, size } = useThree();
  const aspect = size.width / size.height;
  const camZ = aspect < 1 ? BASE_Z + (1 - aspect) * 5.5 : BASE_Z;
  const inset = useRef(0); // eased towards world.viewInset, so tucking the rail glides
  const applied = useRef(NaN);
  const zoomOut = useRef(1); // portrait screens step back a little to win back the rail's width

  useEffect(() => {
    applied.current = NaN; // screen size changed: re-apply the offset and bounds
    world.bounds.maxY = aspect < 0.8 ? 2.3 : 1.6;
  }, [aspect, camZ, size.width, size.height]);

  useFrame((state, dt) => {
    const target = Math.min(world.viewInset || 0, size.width * 0.4);
    inset.current += (target - inset.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 6));
    if (Math.abs(target - inset.current) < 0.5) inset.current = target;
    if (inset.current !== applied.current) {
      const off = inset.current;
      applied.current = off;
      if (off > 0) camera.setViewOffset(size.width, size.height, -off / 2, 0, size.width, size.height);
      else camera.clearViewOffset();
      zoomOut.current = aspect < 1 ? 1 + 0.5 * (off / size.width) : 1;
      const halfW = camZ * zoomOut.current * Math.tan((FOV / 2) * (Math.PI / 180)) * aspect;
      const covered = (off / size.width) * halfW; // world units hidden by the rail on each side
      const maxX = Math.max(1.4, Math.min(6.5, halfW - covered - 0.7));
      world.bounds.minX = -maxX;
      world.bounds.maxX = maxX;
    }

    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 2);
    // Lean gently towards the fish whose card is open.
    const sel = calm ? null : world.runtime.get(getState().selectedId);
    const px = calm ? 0 : state.pointer.x * 0.6 + (sel ? sel.pos.x * 0.12 : 0);
    const py = calm ? 0 : state.pointer.y * 0.3 + (sel ? sel.pos.y * 0.06 : 0);
    camera.position.x += (px - camera.position.x) * k;
    camera.position.y += (0.4 + py - camera.position.y) * k;
    camera.position.z += (camZ * zoomOut.current - camera.position.z) * k;
    camera.lookAt(0, -0.2, 0);
  });
  return null;
}

export default function Aquarium() {
  const calm = useStore((s) => s.settings.calmMode);
  const party = useStore((s) => s.party);
  const night = useStore((s) => s.daylight === 'night');
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1));
  const [slow, setSlow] = useState(false);
  // Fewer seagrass blades, pebbles and school fish on phones, in calm mode and on slow devices.
  const detail = calm || slow || Math.min(window.innerWidth, window.innerHeight) < 600 ? 'low' : 'high';

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
        onDecline={() => {
          setDpr(1);
          setSlow(true);
        }}
        onIncline={() => setDpr(Math.min(1.5, window.devicePixelRatio || 1))}
      />
      <DayNight />

      <CameraRig calm={calm} />
      <WaterTap />
      <Seabed />
      <Rocks />
      <Decorations calm={calm} />
      <SeabedScatter detail={detail} />
      <Algae detail={detail} />
      <Critters calm={calm} />
      <GiantClam />
      <GardenEels calm={calm} />
      <HermitCrab calm={calm} />
      <Nudibranchs />
      <Stingray calm={calm} />
      <MorayEel calm={calm} />
      <Cuttlefish calm={calm} />
      {night && <NightLife />}
      <Coral calm={calm} />
      <TreasureChest />
      <Starfish />
      <Crab />
      <Turtle />
      <Octopus calm={calm} />
      <Lobster />
      <Shrimp calm={calm} />
      <Seahorse calm={calm} />
      <Jellyfish calm={calm} />
      <FishSchool detail={detail} calm={calm} />
      <Visitors />
      {party && <Balloons />}
      <Plants calm={calm} />
      <Bubbles ambient={calm ? 18 : 45} airStone={!calm} />
      <WaterSurface />
      {!calm && <SeaSnow />}
      <School />
      <FoodPellets />
      <Hearts />
      <AsmaDiver />
      <Shark />
    </Canvas>
  );
}
