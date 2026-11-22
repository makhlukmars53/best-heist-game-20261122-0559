// VAULTBREAK — guards.js
// One clear job: the guards. Patrol waypoints, vision cones, the fair
// spotted timer, the chase, and what a thrown coin does to a patrol.

import { GUARD, THIEF } from './config.js';
import { hasLineOfSight, moveCircle, thiefInsideSmoke } from './world.js';

export function createGuard(def) {
  const start = def.waypoints[def.start % def.waypoints.length];
  return {
    x: start[0],
    y: start[1],
    radius: GUARD.radius,
    waypoints: def.waypoints,
    wpIndex: (def.start + 1) % def.waypoints.length,
    angle: 0,
    // 0..1: how sure this guard is that they saw the thief.
    suspicion: 0,
    state: 'patrol', // patrol | investigate | chase
    chaseLeft: 0,
    investigateLeft: 0,
    target: null,
    // How far this guard can see right now (sneaking shrinks it).
    range: GUARD.visionRange,
  };
}

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can this guard see the thief right now? Smoke and walls both block sight.
export function guardSeesThief(guard, state) {
  const t = state.thief;
  const dx = t.x - guard.x;
  const dy = t.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = guard.range;
  if (dist > range) return false;
  const toThief = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toThief, guard.angle)) > GUARD.visionHalfAngle) return false;
  if (thiefInsideSmoke(state, t.x, t.y)) return false;
  return hasLineOfSight(guard.x, guard.y, t.x, t.y, state.walls);
}

export function updateGuard(guard, state, dt) {
  const t = state.thief;
  guard.range = GUARD.visionRange * (t.sneaking ? THIEF.sneakSpotFactor : 1);
  const sees = guardSeesThief(guard, state);

  if (sees) {
    guard.suspicion = Math.min(1, guard.suspicion + dt / GUARD.spotTime);
    if (guard.suspicion >= 1 && guard.state !== 'chase') {
      guard.state = 'chase';
      guard.chaseLeft = GUARD.chaseMemory;
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - (dt / GUARD.spotTime) * 0.8);
  }

  if (guard.state === 'chase') {
    if (sees) {
      guard.chaseLeft = GUARD.chaseMemory;
      guard.target = { x: t.x, y: t.y };
    } else {
      guard.chaseLeft -= dt;
      if (guard.chaseLeft <= 0) {
        guard.state = 'patrol';
        guard.target = null;
      }
    }
    if (guard.target) {
      const a = angleTo(guard.x, guard.y, guard.target.x, guard.target.y);
      guard.angle = a;
      const step = GUARD.chaseSpeed * dt;
      const ox = guard.x;
      const oy = guard.y;
      moveCircle(guard, Math.cos(a) * step, Math.sin(a) * step, state.walls);
      // A wall straight ahead must not end the chase: slide along it instead.
      if (Math.hypot(guard.x - ox, guard.y - oy) < step * 0.25) {
        const side = Math.PI / 2;
        moveCircle(guard, Math.cos(a + side) * step, Math.sin(a + side) * step, state.walls);
        if (Math.hypot(guard.x - ox, guard.y - oy) < step * 0.25) {
          moveCircle(guard, Math.cos(a - side) * step, Math.sin(a - side) * step, state.walls);
        }
      }
    }
    return;
  }

  // A coin landing nearby pulls the guard off patrol to look.
  if (state.coinSpot && guard.state === 'patrol') {
    const d = Math.hypot(state.coinSpot.x - guard.x, state.coinSpot.y - guard.y);
    if (d < 230) {
      guard.state = 'investigate';
      guard.investigateLeft = GUARD.investigateTime;
      guard.target = { x: state.coinSpot.x, y: state.coinSpot.y };
    }
  }

  if (guard.state === 'investigate' && guard.target) {
    const a = angleTo(guard.x, guard.y, guard.target.x, guard.target.y);
    const d = Math.hypot(guard.target.x - guard.x, guard.target.y - guard.y);
    guard.angle = a;
    if (d > 10) {
      const step = GUARD.patrolSpeed * 1.4 * dt;
      moveCircle(guard, Math.cos(a) * step, Math.sin(a) * step, state.walls);
    } else {
      guard.investigateLeft -= dt;
      guard.angle += dt * 1.6; // look around while checking the noise
      if (guard.investigateLeft <= 0) {
        guard.state = 'patrol';
        guard.target = null;
      }
    }
    return;
  }

  // Patrol: walk to the next waypoint, then turn to the one after.
  const wp = guard.waypoints[guard.wpIndex];
  const a = angleTo(guard.x, guard.y, wp[0], wp[1]);
  const d = Math.hypot(wp[0] - guard.x, wp[1] - guard.y);
  guard.angle = a;
  if (d < 8) {
    guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
  } else {
    const step = GUARD.patrolSpeed * dt;
    moveCircle(guard, Math.cos(a) * step, Math.sin(a) * step, state.walls);
  }
}

// True when any guard is close enough to grab the thief.
export function guardCaughtThief(guards, thief) {
  return guards.some(
    (g) => g.state === 'chase' && Math.hypot(g.x - thief.x, g.y - thief.y) < 26,
  );
}

export function anyGuardChasing(guards) {
  return guards.some((g) => g.state === 'chase');
}

export function maxSuspicion(guards) {
  return guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
}
