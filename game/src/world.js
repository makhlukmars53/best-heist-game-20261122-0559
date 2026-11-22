// VAULTBREAK — world.js
// One clear job: the room itself. Holds the level state (walls, loot, exit,
// smoke clouds, alarm), moves things with collision, and answers the one
// question stealth needs: can this point see that point?

import { VIEW, THIEF, TOOLS } from './config.js';

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function circleHitsRect(cx, cy, radius, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < radius * radius;
}

// True when the straight line between two points crosses no wall.
export function hasLineOfSight(ax, ay, bx, by, walls) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = ax + dx * t;
    const py = ay + dy * t;
    for (const wall of walls) {
      if (pointInRect(px, py, wall)) return false;
    }
  }
  return true;
}

// Move a circle through the room, sliding along walls instead of sticking.
export function moveCircle(body, dx, dy, walls) {
  const nx = body.x + dx;
  if (!walls.some((w) => circleHitsRect(nx, body.y, body.radius, w))) body.x = nx;
  const ny = body.y + dy;
  if (!walls.some((w) => circleHitsRect(body.x, ny, body.radius, w))) body.y = ny;
  body.x = Math.max(18 + body.radius, Math.min(VIEW.width - 18 - body.radius, body.x));
  body.y = Math.max(18 + body.radius, Math.min(VIEW.height - 18 - body.radius, body.y));
}

export function createLevelState(levelDef) {
  return {
    def: levelDef,
    walls: levelDef.walls,
    thief: {
      x: levelDef.thiefStart.x,
      y: levelDef.thiefStart.y,
      radius: THIEF.radius,
      sneaking: false,
      facing: -Math.PI / 2,
    },
    loot: levelDef.loot.map((l) => ({ ...l, taken: false })),
    lootValue: 0,
    lootTaken: 0,
    lootTotal: levelDef.loot.length,
    alarm: 0,
    alarmPeak: 0,
    timeSec: 0,
    smoke: [], // { x, y, radius, left }
    empLeft: 0,
    tools: {
      coin: TOOLS.coin.uses,
      smoke: TOOLS.smoke.uses,
      emp: TOOLS.emp.uses,
    },
    exitOpen: false,
    // Last place a coin landed, for guards to investigate.
    coinSpot: null,
  };
}

export function thiefInsideSmoke(state, x, y) {
  return state.smoke.some((s) => Math.hypot(x - s.x, y - s.y) < s.radius);
}

export function updateSmokeAndEmp(state, dt) {
  for (const s of state.smoke) s.left -= dt;
  state.smoke = state.smoke.filter((s) => s.left > 0);
  if (state.empLeft > 0) state.empLeft -= dt;
}

export function lootAt(state, x, y) {
  return state.loot.find((l) => !l.taken && Math.hypot(l.x - x, l.y - y) < 26);
}

export function takeLoot(state, item) {
  item.taken = true;
  state.lootTaken += 1;
  state.lootValue += item.value;
  state.exitOpen = state.loot.every((l) => l.taken);
}

export function thiefAtExit(state) {
  const e = state.def.exit;
  const t = state.thief;
  return (
    state.exitOpen &&
    t.x > e.x - 10 &&
    t.x < e.x + e.w + 10 &&
    t.y > e.y - 6 &&
    t.y < e.y + e.h + 26
  );
}
