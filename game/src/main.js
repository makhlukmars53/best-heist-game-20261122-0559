// VAULTBREAK — main.js
// One clear job: run the game. Owns the state machine (title, playing,
// level-clear, caught, lockdown, won), the frame loop, the alarm, the tools,
// the score, and the ?shot= poses the screenshots are taken from.

import { VIEW, LEVELS, THIEF, ALARM, TOOLS, GUARD } from './config.js';
import {
  createLevelState,
  moveCircle,
  updateSmokeAndEmp,
  lootAt,
  takeLoot,
  thiefAtExit,
} from './world.js';
import {
  createGuard,
  updateGuard,
  guardCaughtThief,
  anyGuardChasing,
  maxSuspicion,
} from './guards.js';
import { createCamera, updateCamera, anyCameraLocked, maxCameraLock } from './cameras.js';
import { drawWorld, drawHud, drawTitle, drawEnd } from './render.js';
import { createInput, moveVector, isSneaking, wasPressed, endFrame } from './input.js';
import {
  ensureAudio,
  playPickup,
  playCoin,
  playSmoke,
  playEmp,
  playSpotted,
  playCaught,
  playWin,
  playClick,
  playStep,
  updateAlarmDrone,
  toggleMute,
  isMuted,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = createInput(canvas);
const params = new URLSearchParams(location.search);
const shot = params.get('shot');

let screen = 'title'; // title | playing | levelclear | caught | lockdown | won
let levelIndex = 0;
let state = null;
let guards = [];
let cameras = [];
let message = null;
let messageLeft = 0;
let totalScore = 0;
let bestTake = 0;
let spottedStingPlayed = false;
let stepTimer = 0;
let lastTime = performance.now();

function loadLevel(index) {
  levelIndex = index;
  state = createLevelState(LEVELS[index]);
  guards = LEVELS[index].guards.map(createGuard);
  cameras = LEVELS[index].cameras.map(createCamera);
  message = null;
  messageLeft = 0;
  spottedStingPlayed = false;
}

function showMessage(text, color, seconds) {
  message = { text, color };
  messageLeft = seconds;
}

function levelScore() {
  const timeBonus = Math.max(0, LEVELS[levelIndex].par - Math.floor(state.timeSec)) * 20;
  const alarmBonus = Math.round((100 - state.alarmPeak) * 5);
  return state.lootValue + timeBonus + alarmBonus;
}

function useCoin(target) {
  if (state.tools.coin <= 0) return;
  state.tools.coin -= 1;
  state.coinSpot = { x: target.x, y: target.y, left: 1.5 };
  playCoin();
  showMessage('Coin tossed — the guards go to look', '#ffd34d', 1.6);
}

function useSmoke() {
  if (state.tools.smoke <= 0) return;
  state.tools.smoke -= 1;
  state.smoke.push({ x: state.thief.x, y: state.thief.y, radius: TOOLS.smoke.radius, left: TOOLS.smoke.duration });
  playSmoke();
  showMessage('Smoke out — you are hidden inside the cloud', '#c8d2dc', 1.6);
}

function useEmp() {
  if (state.tools.emp <= 0) return;
  state.tools.emp -= 1;
  state.empLeft = TOOLS.emp.duration;
  playEmp();
  showMessage('EMP fired — cameras dark for 6 seconds', '#7cc8ff', 1.6);
}

function updatePlaying(dt) {
  state.timeSec += dt;
  updateSmokeAndEmp(state, dt);
  if (state.coinSpot) {
    state.coinSpot.left -= dt;
    if (state.coinSpot.left <= 0) state.coinSpot = null;
  }
  if (messageLeft > 0) {
    messageLeft -= dt;
    if (messageLeft <= 0) message = null;
  }

  // Move the thief.
  const mv = moveVector(input);
  const thief = state.thief;
  thief.sneaking = isSneaking(input);
  const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
  if (mv.x !== 0 || mv.y !== 0) {
    thief.facing = Math.atan2(mv.y, mv.x);
    moveCircle(thief, mv.x * speed * dt, mv.y * speed * dt, state.walls);
    stepTimer -= dt;
    if (stepTimer <= 0) {
      stepTimer = thief.sneaking ? 0.55 : 0.34;
      playStep();
    }
  }

  // Tools: keys 1/2/3, or click the room to toss a coin there.
  if (wasPressed(input, '1')) useCoin({ x: input.mouse.x, y: input.mouse.y });
  if (wasPressed(input, '2')) useSmoke();
  if (wasPressed(input, '3')) useEmp();
  if (input.mouse.clicked) {
    // Clicking inside the room tosses a coin at that spot; HUD clicks do nothing.
    if (input.mouse.clickY > 46 && input.mouse.clickY < VIEW.height - 44) {
      useCoin({ x: input.mouse.clickX, y: input.mouse.clickY });
    }
  }
  if (wasPressed(input, 'm')) {
    const m = toggleMute();
    showMessage(m ? 'Sound muted' : 'Sound on', '#9fb3c8', 1.2);
  }

  for (const g of guards) updateGuard(g, state, dt);
  for (const c of cameras) updateCamera(c, state, dt);

  // The alarm: chases and camera locks push it up, hiding lets it fall.
  const chasing = anyGuardChasing(guards);
  const camLocked = anyCameraLocked(cameras);
  if (chasing) state.alarm += ALARM.chaseRisePerSec * dt;
  if (camLocked) state.alarm += ALARM.cameraRisePerSec * dt;
  if (!chasing && !camLocked) state.alarm -= ALARM.decayPerSec * dt;
  state.alarm = Math.max(0, Math.min(ALARM.max, state.alarm));
  state.alarmPeak = Math.max(state.alarmPeak, state.alarm);
  updateAlarmDrone(state.alarm);

  // The fair caught moment: a guard must finish the suspicion arc first,
  // and the player sees the "!" and the SPOTTED banner before the chase.
  const susp = maxSuspicion(guards);
  const camLock = maxCameraLock(cameras);
  if ((susp > 0.5 || camLock > 0.5) && !spottedStingPlayed) {
    spottedStingPlayed = true;
    playSpotted();
    showMessage('SPOTTED! Break line of sight!', '#ff5252', 1.4);
  }
  if (susp < 0.3 && camLock < 0.3) spottedStingPlayed = false;

  // Loot pickup.
  const item = lootAt(state, thief.x, thief.y);
  if (item) {
    takeLoot(state, item);
    playPickup(item.kind);
    if (item.kind === 'vault') {
      showMessage('The sapphire is yours — reach the EXIT!', '#4db2ff', 2.2);
    } else {
      showMessage(`+$${item.value} loot`, '#ffd34d', 1.0);
    }
  }

  if (state.alarm >= ALARM.max) {
    screen = 'lockdown';
    playCaught();
    return;
  }
  if (guardCaughtThief(guards, thief)) {
    screen = 'caught';
    playCaught();
    return;
  }
  if (thiefAtExit(state)) {
    const gained = levelScore();
    totalScore += gained;
    bestTake = Math.max(bestTake, totalScore);
    if (levelIndex + 1 >= LEVELS.length) {
      screen = 'won';
      playWin();
    } else {
      screen = 'levelclear';
      playWin();
    }
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (screen === 'title') {
    if (wasPressed(input, 'enter') || input.mouse.clicked) {
      ensureAudio();
      playClick();
      totalScore = 0;
      loadLevel(0);
      screen = 'playing';
    }
    drawTitle(ctx, bestTake);
  } else if (screen === 'playing') {
    updatePlaying(dt);
    drawWorld(ctx, state, guards, cameras);
    drawHud(ctx, state, guards, cameras, levelIndex, LEVELS.length, message);
  } else if (screen === 'levelclear') {
    drawWorld(ctx, state, guards, cameras);
    drawHud(ctx, state, guards, cameras, levelIndex, LEVELS.length, null);
    if (wasPressed(input, 'enter') || input.mouse.clicked) {
      ensureAudio();
      playClick();
      loadLevel(levelIndex + 1);
      screen = 'playing';
    }
    ctx.fillStyle = 'rgba(8, 12, 17, 0.82)';
    ctx.fillRect(0, 220, VIEW.width, 200);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(`${LEVELS[levelIndex].name} — cleared!`, VIEW.width / 2, 280);
    ctx.fillStyle = '#e8eef4';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Take this room: $${state.lootValue.toLocaleString()}  ·  Total score: ${totalScore.toLocaleString()}`, VIEW.width / 2, 325);
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Press ENTER for the next room', VIEW.width / 2, 375);
    ctx.textAlign = 'left';
  } else if (screen === 'caught' || screen === 'lockdown') {
    drawWorld(ctx, state, guards, cameras);
    drawHud(ctx, state, guards, cameras, levelIndex, LEVELS.length, null);
    const lines =
      screen === 'caught'
        ? ['A guard grabbed you by the collar.', `Loot kept: $${state.lootValue.toLocaleString()}`, `Alarm peaked at ${Math.round(state.alarmPeak)}%`]
        : ['The alarm hit 100%. Doors sealed, lights on.', `Loot kept: $${state.lootValue.toLocaleString()}`, 'Next time, break line of sight sooner.'];
    drawEnd(ctx, screen, lines);
    if (wasPressed(input, 'enter') || input.mouse.clicked) {
      ensureAudio();
      playClick();
      loadLevel(levelIndex);
      screen = 'playing';
    }
  } else if (screen === 'won') {
    drawEnd(ctx, 'win', [
      'Three rooms, three vaults, zero alarms that mattered.',
      `Final take: $${totalScore.toLocaleString()}`,
      `Best alarm peak: ${Math.round(state.alarmPeak)}% — the crew is impressed.`,
    ]);
    if (wasPressed(input, 'enter') || input.mouse.clicked) {
      ensureAudio();
      playClick();
      totalScore = 0;
      loadLevel(0);
      screen = 'playing';
    }
  }

  endFrame(input);
  requestAnimationFrame(frame);
}

// --- Screenshot poses -------------------------------------------------------
// ?shot=start  — level 1, thief at the door, patrols mid-route, alarm 0.
// ?shot=play   — mid-heist: thief near the sapphire, a guard suspicious,
//                one camera locked, alarm climbing.
// ?shot=caught — alarm high, a guard chasing, SPOTTED banner up.
// ?shot=getaway— all loot taken, exit open, thief one step from the door.
function applyShotPose() {
  if (!shot) return;
  loadLevel(0);
  screen = 'playing';
  if (shot === 'start') {
    state.thief.x = 120;
    state.thief.y = 560;
    state.thief.facing = -Math.PI / 2;
    guards[0].x = 480; guards[0].y = 220; guards[0].angle = 0;
    guards[1].x = 420; guards[1].y = 320; guards[1].angle = Math.PI;
    cameras[0].angle = Math.PI / 2 + 0.4;
    cameras[1].angle = -Math.PI / 2 - 0.4;
  } else if (shot === 'play') {
    state.thief.x = 430; state.thief.y = 430;
    state.thief.facing = -Math.PI / 2;
    state.loot[0].taken = true; state.lootTaken = 1; state.lootValue = 400;
    state.alarm = 38; state.alarmPeak = 38;
    guards[0].x = 380; guards[0].y = 300; guards[0].angle = Math.PI / 4;
    guards[0].suspicion = 0.72;
    guards[1].x = 620; guards[1].y = 420; guards[1].angle = -Math.PI / 2;
    cameras[0].angle = Math.PI / 2 + 0.5; cameras[0].lock = 0.6;
    showMessage('SPOTTED! Break line of sight!', '#ff5252', 999);
  } else if (shot === 'caught') {
    state.thief.x = 480; state.thief.y = 380;
    state.thief.facing = Math.PI;
    state.alarm = 55; state.alarmPeak = 55;
    guards[0].x = 640; guards[0].y = 460; guards[0].angle = Math.PI;
    guards[0].state = 'chase'; guards[0].suspicion = 1;
    guards[0].chaseLeft = GUARD.chaseMemory;
    guards[0].target = { x: state.thief.x, y: state.thief.y };
    guards[1].x = 620; guards[1].y = 300; guards[1].angle = -Math.PI / 2;
    showMessage('SPOTTED! Break line of sight!', '#ff5252', 999);
  } else if (shot === 'getaway') {
    for (const item of state.loot) item.taken = true;
    state.lootTaken = 3; state.lootValue = 3300; state.exitOpen = true;
    state.thief.x = 70; state.thief.y = 120;
    state.thief.facing = -Math.PI / 2;
    state.alarm = 24; state.alarmPeak = 41;
    guards[0].x = 600; guards[0].y = 420; guards[0].angle = Math.PI;
    guards[1].x = 300; guards[1].y = 320; guards[1].angle = 0;
    showMessage('The sapphire is yours — reach the EXIT!', '#4db2ff', 999);
  }
}

applyShotPose();
requestAnimationFrame(frame);

// Expose a tiny handle for automated play-testing in the browser console.
window.__vaultbreak = {
  get screen() { return screen; },
  get level() { return levelIndex; },
  get alarm() { return state ? state.alarm : 0; },
  get lootTaken() { return state ? state.lootTaken : 0; },
  get score() { return totalScore; },
  get tools() { return state ? { ...state.tools } : null; },
  get empLeft() { return state ? state.empLeft : 0; },
  get smokeCount() { return state ? state.smoke.length : 0; },
  get exitOpen() { return state ? state.exitOpen : false; },
  get guardStates() { return guards.map((g) => g.state); },
  thiefPos() { return state ? { x: state.thief.x, y: state.thief.y } : null; },
  // Test-only hook: place the thief somewhere to drive a scenario.
  teleport(x, y) { if (state) { state.thief.x = x; state.thief.y = y; } },
  start() { ensureAudio(); totalScore = 0; loadLevel(0); screen = 'playing'; },
  setShot(name) { loadLevel(0); screen = 'playing'; },
};
