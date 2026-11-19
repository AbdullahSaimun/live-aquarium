import { useFrame } from '@react-three/fiber';
import { useStore } from '../state/store';
import { world } from '../sim/world';
import Fish from './Fish';
import { tickCurrent } from '../sim/life';

export default function School() {
  const fish = useStore((s) => s.fish);

  // Shared simulation clock; runs before the fish (registered first).
  useFrame((_, dt) => {
    world.time += Math.min(dt, 0.1);
    tickCurrent(world.current, world.time);
  });

  return fish.map((f) => <Fish key={f.id} fish={f} />);
}
