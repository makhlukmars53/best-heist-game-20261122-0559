// VAULTBREAK — cameras.js
// One clear job: the security cameras. They sit on the walls, sweep their
// cones back and forth, and feed the alarm when the thief crosses their view.

import { CAMERA, THIEF } from './config.js';
import { hasLineOfSight, thiefInsideSmoke } from './world.js';

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.angle,
    angle: def.angle,
    sweep: def.sweep,
    sweepPhase: Math.random() * Math.PI * 2,
    range: CAMERA.visionRange,
    // 0..1: how locked-on this camera is.
    lock: 0,
    disabled: false,
  };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function cameraSeesThief(camera, state) {
  if (camera.disabled) return false;
  const t = state.thief;
  const dx = t.x - camera.x;
  const dy = t.y - camera.y;
  const dist = Math.hypot(dx, dy);
  const range = camera.range * (t.sneaking ? THIEF.sneakSpotFactor : 1);
  if (dist > range) return false;
  const toThief = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toThief, camera.angle)) > CAMERA.visionHalfAngle) return false;
  if (thiefInsideSmoke(state, t.x, t.y)) return false;
  return hasLineOfSight(camera.x, camera.y, t.x, t.y, state.walls);
}

export function updateCamera(camera, state, dt) {
  camera.disabled = state.empLeft > 0;
  // Sweep back and forth around the base angle, like a real mount.
  camera.sweepPhase += dt * CAMERA.sweepSpeed;
  camera.angle =
    camera.baseAngle + Math.sin(camera.sweepPhase) * camera.sweep * CAMERA.sweepArc;

  if (camera.disabled) {
    camera.lock = Math.max(0, camera.lock - dt);
    return;
  }
  if (cameraSeesThief(camera, state)) {
    camera.lock = Math.min(1, camera.lock + dt / 1.4);
  } else {
    camera.lock = Math.max(0, camera.lock - dt / 1.4);
  }
}

export function anyCameraLocked(cameras) {
  return cameras.some((c) => c.lock > 0.35);
}

export function maxCameraLock(cameras) {
  return cameras.reduce((m, c) => Math.max(m, c.lock), 0);
}
