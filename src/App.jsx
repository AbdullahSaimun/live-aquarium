import { useEffect } from 'react';
import Aquarium from './scene/Aquarium';
import HUD from './ui/HUD';
import FishLabels from './ui/FishLabels';
import { AsmaCard } from './ui/Asma';
import FishCard from './ui/FishCard';
import AnniversaryButton from './ui/Anniversary';
import { FactPanel, SettingsPanel, MemoriesPanel, EmptyTank, WelcomeHint, Toasts } from './ui/Panels';
import { useStore, tickStats, save, announceLosses } from './state/store';

function useGameLoop() {
  useEffect(() => {
    announceLosses();
    let last = performance.now();
    let sinceSave = 0;
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(5, (now - last) / 1000);
      last = now;
      tickStats(dt);
      sinceSave += dt;
      if (sinceSave > 5) {
        sinceSave = 0;
        save();
      }
    }, 1000);
    const onHide = () => document.visibilityState === 'hidden' && save();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', save);
    };
  }, []);
}

export default function App() {
  useGameLoop();
  const panel = useStore((s) => s.panel);
  return (
    <div className="app">
      <Aquarium />
      <FishLabels />
      <HUD />
      <AsmaCard />
      <AnniversaryButton />
      <FishCard />
      {panel === 'facts' && <FactPanel />}
      {panel === 'settings' && <SettingsPanel />}
      {panel === 'memories' && <MemoriesPanel />}
      <EmptyTank />
      <Toasts />
      <WelcomeHint />
    </div>
  );
}
