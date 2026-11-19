# Burger Buster

A browser-playable Three.js prototype for a short arcade survival game. The current build covers the core run loop and progression; it is not yet a CrazyGames submission build.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173/`). Do not open `index.html` directly from the file system: the module imports and styles require the Vite server.

Create and serve a production build with:

```sh
npm run build
npm run preview
```

## Controls

- Move with WASD or the arrow keys.
- Click a point in the arena to walk there.
- On touch screens, drag the virtual stick in landscape orientation.
- Aim and fire automatically at the nearest enemy.
- Press Escape or P, or use the pause button, to pause.

## Implemented

- Isometric orthographic camera, bounded city street arena, mobile layout, and landscape prompt.
- Procedural low-poly hero with six visible body states driven by fat level.
- Donut, hot-dog, and burger enemies; wave spawning; automatic pistol; collisions; and coin drops.
- Fat rises on enemy hits and falls on kills. Coins only increase the run reward.
- Start, pause, result, restart, and permanent upgrade shop screens.
- Defensive, versioned local save for coins, upgrades, and best time.
- Synthesized Web Audio cues; no external sound files.
- CrazyGames SDK v3 adapter for gameplay events, rewarded revive, and a midgame ad request after each second death. The game remains playable when the SDK is unavailable.
- Reused enemy, projectile, and coin instances; no real-time shadows; renderer pixel ratio capped for mobile.
- Low, medium, and high rendering presets with a device-aware default.

## Asset plan

The current hero, enemies, coins, and street props are temporary Three.js meshes. The reference board is preserved at `design/art-direction-reference.png`.

Replace temporary meshes in this order:

1. Hero: one rigged GLB with six body-shape variants sharing a skeleton, plus idle, run, hit, and death animations. Keep the white tee, blue shorts, sneakers, expressive face, and readable silhouette.
2. Enemies: separate compact GLBs for donut, hot dog, and burger, each with a shared simple rig and idle/move/hit/death clips.
3. Street: modular low-poly storefronts, road markings, streetlights, cars, trees, and a few skyline shapes. Keep collision geometry simple and reuse materials.
4. Effects and audio: small muzzle flash, hit burst, coin pickup sparkle, and licensed or original short sound effects.

Keep models low-poly, use shared materials and small texture atlases where textures help, and export game assets as optimized GLB. Do not add downloaded or generated third-party assets until their license and intended use are clear. Replace the procedural constructors in `src/game/models.ts` behind the same model interfaces so gameplay code does not depend on asset details.

## Remaining before portal submission

- Replace placeholder meshes with final licensed GLB assets and animation.
- Tune survival balance and improve hit feedback after play sessions.
- Validate the SDK, ad callbacks, and platform policies in CrazyGames preview.
- Profile on a real mobile device and adjust quality settings from measured results.
- Check browser console, mobile landscape controls, and production hosting paths.

The current Vite build is suitable for local review. Portal approval, ad inventory, and mobile-device performance have not been verified.
