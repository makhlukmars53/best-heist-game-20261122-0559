// VAULTBREAK — config.js
// One clear job: every number and every level layout lives here, so tuning
// the game never means hunting through the logic files.

export const VIEW = { width: 960, height: 640 };

export const THIEF = {
  radius: 13,
  walkSpeed: 185,
  sneakSpeed: 105,
  // Sneaking shrinks how far guards and cameras can spot the thief.
  sneakSpotFactor: 0.62,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 165,
  visionRange: 175,
  visionHalfAngle: 0.62, // radians, about 35 degrees each side
  // Seconds of continuous sight before a guard commits to the chase.
  spotTime: 1.1,
  // Seconds a guard keeps chasing after losing sight.
  chaseMemory: 2.5,
  investigateTime: 3.0,
};

export const CAMERA = {
  visionRange: 190,
  visionHalfAngle: 0.5,
  sweepSpeed: 0.55, // radians per second
  sweepArc: 0.9, // radians each side of the base angle
};

export const ALARM = {
  chaseRisePerSec: 26,
  cameraRisePerSec: 13,
  decayPerSec: 7,
  max: 100,
  // Alarm at or above this shows the red "LOCKDOWN IMMINENT" warning.
  warningAt: 70,
};

export const TOOLS = {
  coin: { uses: 3, label: 'Coin toss', key: '1', radius: 230 },
  smoke: { uses: 2, label: 'Smoke', key: '2', radius: 95, duration: 4 },
  emp: { uses: 2, label: 'EMP', key: '3', duration: 6 },
};

// A wall is { x, y, w, h } in playfield pixels. A guard patrol is a list of
// [x, y] waypoints. A camera is { x, y, angle, sweep } where sweep is the
// arc it swings through. Loot is { x, y, kind } where kind is 'gem' (small)
// or 'vault' (the big prize). The exit is a door rect on the room edge.
export const LEVELS = [
  {
    name: 'The Gallery',
    brief: 'Lift the Star Sapphire. Two guards, two cameras, one way out.',
    walls: [
      { x: 0, y: 0, w: 960, h: 18 },
      { x: 0, y: 622, w: 960, h: 18 },
      { x: 0, y: 0, w: 18, h: 640 },
      { x: 942, y: 0, w: 18, h: 640 },
      { x: 250, y: 120, w: 150, h: 26 },
      { x: 560, y: 120, w: 150, h: 26 },
      { x: 250, y: 480, w: 150, h: 26 },
      { x: 560, y: 480, w: 150, h: 26 },
      { x: 430, y: 250, w: 100, h: 26 },
      { x: 430, y: 370, w: 100, h: 26 },
      { x: 120, y: 280, w: 26, h: 90 },
      { x: 814, y: 280, w: 26, h: 90 },
    ],
    thiefStart: { x: 60, y: 560 },
    exit: { x: 18, y: 56, w: 70, h: 14 },
    guards: [
      { waypoints: [[300, 220], [660, 220], [660, 420], [300, 420]], start: 0 },
      { waypoints: [[700, 320], [260, 320]], start: 1 },
    ],
    cameras: [
      { x: 480, y: 60, angle: Math.PI / 2, sweep: 0.9 },
      { x: 480, y: 580, angle: -Math.PI / 2, sweep: 0.9 },
    ],
    loot: [
      { x: 325, y: 90, kind: 'gem', value: 400 },
      { x: 635, y: 90, kind: 'gem', value: 400 },
      { x: 480, y: 320, kind: 'vault', value: 2500 },
    ],
    par: 75,
  },
  {
    name: 'The Vault Floor',
    brief: 'Three guards, three cameras. The vault core is worth the risk.',
    walls: [
      { x: 0, y: 0, w: 960, h: 18 },
      { x: 0, y: 622, w: 960, h: 18 },
      { x: 0, y: 0, w: 18, h: 640 },
      { x: 942, y: 0, w: 18, h: 640 },
      { x: 180, y: 140, w: 26, h: 180 },
      { x: 500, y: 140, w: 26, h: 180 },
      { x: 754, y: 140, w: 26, h: 180 },
      { x: 180, y: 330, w: 26, h: 180 },
      { x: 500, y: 330, w: 26, h: 180 },
      { x: 754, y: 330, w: 26, h: 180 },
      { x: 340, y: 300, w: 280, h: 24 },
    ],
    thiefStart: { x: 60, y: 560 },
    exit: { x: 872, y: 56, w: 70, h: 14 },
    guards: [
      { waypoints: [[120, 90], [120, 550], [340, 550], [340, 90]], start: 0 },
      { waypoints: [[620, 90], [620, 550], [860, 550], [860, 90]], start: 2 },
      { waypoints: [[480, 180], [480, 460]], start: 0 },
    ],
    cameras: [
      { x: 340, y: 60, angle: Math.PI / 2, sweep: 1.0 },
      { x: 620, y: 60, angle: Math.PI / 2, sweep: 1.0 },
      { x: 480, y: 580, angle: -Math.PI / 2, sweep: 0.8 },
    ],
    loot: [
      { x: 90, y: 90, kind: 'gem', value: 500 },
      { x: 880, y: 320, kind: 'gem', value: 500 },
      { x: 90, y: 320, kind: 'gem', value: 500 },
      { x: 480, y: 320, kind: 'vault', value: 4000 },
    ],
    par: 90,
  },
  {
    name: 'The Rooftop Vault',
    brief: 'The last score. Tight patrols, no room to breathe. Get out rich.',
    walls: [
      { x: 0, y: 0, w: 960, h: 18 },
      { x: 0, y: 622, w: 960, h: 18 },
      { x: 0, y: 0, w: 18, h: 640 },
      { x: 942, y: 0, w: 18, h: 640 },
      { x: 220, y: 110, w: 200, h: 24 },
      { x: 540, y: 110, w: 200, h: 24 },
      { x: 220, y: 500, w: 200, h: 24 },
      { x: 540, y: 500, w: 200, h: 24 },
      { x: 220, y: 240, w: 24, h: 160 },
      { x: 716, y: 240, w: 24, h: 160 },
      { x: 420, y: 290, w: 120, h: 24 },
    ],
    thiefStart: { x: 480, y: 560 },
    exit: { x: 445, y: 56, w: 70, h: 14 },
    guards: [
      { waypoints: [[120, 120], [840, 120], [840, 520], [120, 520]], start: 0 },
      { waypoints: [[320, 320], [640, 320], [640, 200], [320, 200]], start: 1 },
      { waypoints: [[840, 320], [120, 320]], start: 0 },
    ],
    cameras: [
      { x: 60, y: 320, angle: 0, sweep: 1.1 },
      { x: 900, y: 320, angle: Math.PI, sweep: 1.1 },
    ],
    loot: [
      { x: 90, y: 90, kind: 'gem', value: 600 },
      { x: 870, y: 90, kind: 'gem', value: 600 },
      { x: 90, y: 540, kind: 'gem', value: 600 },
      { x: 870, y: 540, kind: 'gem', value: 600 },
      { x: 480, y: 320, kind: 'vault', value: 6000 },
    ],
    par: 110,
  },
];
