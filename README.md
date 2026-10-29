# 🐠 Live Aquarium

**My Little Ocean** is a cozy, interactive 3D aquarium for kids. Feed the fish, watch them grow, learn fun ocean facts in **বাংলা** or English, and learn to look after pets responsibly.

Built with React, Vite, Three.js, React Three Fiber and drei. Everything runs in the browser: no backend, no accounts, no downloads.

## Features

**Fish and the tank**
- Cute fish built from simple shapes in code (clownfish, blue tang, yellow tang, angelfish, betta). No 3D model files are needed.
- Smooth curved swimming, wagging tails, flapping fins and blinking, sleepy eyes.
- Coral, kelp, anemones, starfish, rocks, light rays, rippling light on the sand and rising bubbles.

**Feeding**
- **Feed** drops a handful of pellets. **Tap the water** to drop food exactly where you want it.
- Drag a falling pellet to bring it to a shy fish.
- Fish notice food, race to it and eat it with hearts and bubbles.
- No overfeeding: full fish say "I'm full!", and too much food in the water triggers a friendly warning.

**Moods and personalities**
- Each fish is playful, shy, sleepy or snacky.
- Fish are happy 😊, hungry 🍤, curious 👀 (they come and say hi), sleepy 💤 or weak 🥺.
- Tap a fish to see its card: tummy, growth, health and love meters, plus a species fact. Every tap makes it do a happy barrel roll.

**Growing up**
- Feeding raises growth and love. Fish get bigger and unlock new colors at 50% and 100% growth.
- A grown-up fish with lots of love has a baby (up to 10 fish).

**Caring matters**
- Fish that stay very hungry lose health, turn pale and slow down. If they wait too long, they die.
- Lost fish are kept in **🌈 Memories** with their name, how long they lived and how many snacks they ate.
- If the tank becomes empty, the child can adopt new fish.

**👧 Asma, the fish's best friend**
- Asma is a kind, cheerful girl who dives into the tank holding her breath, with puffed cheeks, goggles and yellow flippers.
- The fish swim in circles around her while she says sweet things and shares snacks with them.
- She stays as long as her breath lasts (shown as a 🫧 breath meter), then swims up for air.
- Afterwards the fish ask "Bring Asma back!" and the 👧 button glows. Tap it to call her again once she has caught her breath.
- Tap Asma for a twirl and hearts. She also visits on her own every few minutes (this can be turned off in Settings).

**Learning and fun**
- **💡 Facts**: ocean, habitat and fish-care facts in Bangla (default) or English.
- **🪙 Treasure chest**: tap it for coins, sparkles and a surprise fact.
- Bubbly sound effects, synthesized in the browser with no audio files.

**Settings**
- Name tags, sounds, Asma's surprise visits and calm mode (less motion) can be turned on or off.
- You can reset the aquarium. Memories are kept.

Progress (fish, growth, love, health, memories, settings) is saved in the browser's `localStorage` and survives refreshes.

## Plays great on every screen

| Device | Layout |
| ------ | ------ |
| **Phone (portrait)** | One-row top bar, full-width dock at the bottom with a big round Feed button rising out of it, fish cards and panels slide up as bottom sheets, toasts appear right above the dock. |
| **Phone (landscape)** | The dock moves to the right edge as a column; cards open as a side sheet on the left. |
| **Tablet** | Floating frosted dock, side sheets, larger buttons. |
| **Desktop** | Same layout with gentle hover effects and mouse parallax. |

- Every tap target is at least 44px, and dock buttons are 56–66px.
- Each dock button has its own colour (Facts yellow, Memories purple, Feed orange, Asma pink, Settings blue), so kids can find them before they can read.
- Safe areas (notches, home bars) are respected, double-tap zoom is disabled, and floating bubbles show icons only on small screens to keep the ocean uncluttered.
- On phones, feeding, tapping a fish and the treasure chest give a tiny haptic buzz.
- **Full screen** button in Settings, and the app can be added to the home screen (web app manifest) to play like a real app.

## Getting started

Requirements: [Node.js](https://nodejs.org/) **20.19+** (the project pins 22.23.4 in `.nvmrc`).

```bash
nvm use            # or: nvm use 22.23.4
npm install
npm run dev        # open http://localhost:5173
```

| Script            | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload      |
| `npm run build`   | Build the production bundle into `dist/`  |
| `npm run preview` | Serve the production build locally        |

The `dist/` folder is a static site, so it can be hosted anywhere (GitHub Pages, Netlify, any web server).

## How to play

1. Tap **Feed**, or tap anywhere in the water, to give the fish snacks.
2. Tap a fish to say hi and see how it is doing.
3. Feed about 3–4 pellets per fish. They will tell you when they are full.
4. Come back regularly. Hungry fish get weak, and very hungry fish can die.
5. Grow your fish to unlock colors and babies, and tap the treasure chest for surprises.
6. Tap **👧 Asma** to invite her for a swim with your fish.

## Game timing

All timings live at the top of `src/state/store.js` and are easy to tune:

| Rule | Default |
| ---- | ------- |
| Fish get fully hungry (app open) | ~3 minutes |
| Starving while the app is open, until death | ~10 minutes |
| Fish get fully hungry (app closed) | ~30 minutes |
| Starving while the app is closed, until death | ~12 hours |
| Asma's breath underwater | ~32 seconds |
| Asma's rest before she can dive again | 20 seconds |
| Pellets to fill a tummy | ~3 |
| Pellets to grow from baby to adult | ~20 |

## Project structure

```
src/
├── App.jsx              App shell and 1-second game tick / autosave
├── audio/sounds.js      Synthesized sound effects (Web Audio)
├── data/
│   ├── species.js       Species, palettes, personalities, names, English facts
│   └── factsBn.js       Bangla facts and fact-panel text
├── sim/
│   ├── world.js         Per-frame simulation state: pellets, bounds, effect queues
│   ├── fishBrain.js     Steering, moods, food seeking, circling Asma
│   └── asmaBrain.js     Asma's dive, breath, snacks and surfacing
├── state/
│   ├── store.js         Game state and actions (feed, eat, grow, starve, memories…)
│   ├── persistence.js   localStorage save/load
│   └── labels.js        DOM label registry for fish name tags
├── scene/               3D: fish model, seabed, coral, plants, bubbles, hearts,
│                        food pellets, treasure chest, Asma, tap-to-feed backdrop
└── ui/                  HUD, fish card, panels (facts, memories, settings), labels
```

## Technical notes

- **Performance:** shared geometries and materials, instanced bubbles and hearts, and pooled pellets. Animation is clamped by frame time, and pixel ratio is capped at 1.5 and lowered automatically on slow devices (drei `PerformanceMonitor`). There are no shadows.
- **No re-render per frame:** fish motion lives in a mutable simulation (`src/sim`). React only re-renders on game events and a 1-second tick.
- **Resource cleanup:** geometries and materials created by components are disposed on unmount.
- **Responsive:** the swim area and camera adapt to portrait phones, tablets and desktops.

## License

No license has been chosen yet. Add one before publishing if others should reuse the code.
