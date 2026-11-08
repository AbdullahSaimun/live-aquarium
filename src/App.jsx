import { useEffect, useState } from 'react';
import Aquarium from './scene/Aquarium';
import HUD from './ui/HUD';
import FishLabels from './ui/FishLabels';
import { AsmaCard } from './ui/Asma';
import FishCard from './ui/FishCard';
import CreatureCard from './ui/CreatureCard';
import StickerBook from './ui/StickerBook';
import DecorPanel from './ui/DecorPanel';
import AnniversaryButton from './ui/Anniversary';
import BirthdayButton, { HusbandCountdown } from './ui/Birthday';
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

// True after `ms` without any touch, click, key or mouse move: the buttons then fade (see styles.css).
function useIdle(ms) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), ms);
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel'];
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    wake();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [ms]);
  return idle;
}

export default function App() {
  useGameLoop();
  const panel = useStore((s) => s.panel);
  const daylight = useStore((s) => s.daylight);
  const idle = useIdle(20000);
  return (
    <div className="app" data-time={daylight} data-idle={idle && !panel ? '' : undefined}>
      {/* Water colour layers behind the 3D scene, cross-faded for sunset and night. */}
      <div className="sky sky-sunset" aria-hidden="true" />
      <div className="sky sky-night" aria-hidden="true" />
      <Aquarium />
      <FishLabels />
      <HUD />
      <AsmaCard />
      <AnniversaryButton />
      <BirthdayButton />
      <HusbandCountdown />
      <FishCard />
      <CreatureCard />
      {panel === 'stickers' && <StickerBook />}
      {panel === 'decor' && <DecorPanel />}
      {panel === 'facts' && <FactPanel />}
      {panel === 'settings' && <SettingsPanel />}
      {panel === 'memories' && <MemoriesPanel />}
      <EmptyTank />
      <Toasts />
      <WelcomeHint />
    </div>
  );
}
