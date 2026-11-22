# VAULTBREAK — a top-down stealth heist

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/makhlukmars53/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/makhlukmars53/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

Slip past the guards, dodge the sweeping cameras, lift the sapphire, and get out before the alarm hits 100%. Three rooms, three vaults, one clean getaway.

## How to play

- Move: WASD or arrow keys. Hold Shift to sneak (slower, harder to spot).
- Tools: press 1 to toss a coin (guards go investigate the clink), 2 for a smoke bomb (hides you inside the cloud), 3 for an EMP (cameras go dark for 6 seconds). Clicking the room tosses a coin at that spot. M mutes sound.
- Guards patrol with visible vision cones. Being seen fills their suspicion arc; a full arc means a chase, and a chase feeds the alarm. Cameras sweep and lock on the same way.
- Grab every loot in the room to open the green EXIT, then reach it. The alarm falls when nobody can see you, so breaking line of sight is always an option.
- Score: loot value plus a time bonus against the room par plus an alarm bonus for staying quiet.

## Play it

Serve `game/` with any static server and open `index.html` in a desktop browser. No build step, no network requests, all sounds synthesized with WebAudio.

```
node serve.ts
```

Then open http://localhost:8080.

## Layout

- `game/index.html`, `game/style.css` — page and styling.
- `game/src/config.js` — all numbers and all three level layouts.
- `game/src/world.js` — the room: collision, line of sight, loot, exit.
- `game/src/guards.js` — patrols, vision cones, suspicion, chase, coin distraction.
- `game/src/cameras.js` — sweeping cameras and their lock-on.
- `game/src/render.js` — everything drawn on the canvas.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — synthesized sounds, no audio files.
- `game/src/main.js` — the loop, the alarm, the tools, the score, screenshot poses.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — real renders of the game, taken in a headless browser.

Built for the make.fun best-heist-game bounty: https://make.fun/?ref=gxm3edtt&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559
