// VAULTBREAK — render.js
// One clear job: everything the player sees. Floor, walls, vision cones,
// cameras, loot, the thief, the HUD, and every screen state. No game logic
// lives here; it only draws the state main.js hands it.

import { VIEW, GUARD, CAMERA } from './config.js';

const FLOOR_A = '#1d2733';
const FLOOR_B = '#1a222c';

function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, g) {
  drawCone(
    ctx,
    g.x,
    g.y,
    g.angle,
    g.range,
    GUARD.visionHalfAngle,
    g.state === 'chase'
      ? 'rgba(255, 60, 60, 0.30)'
      : g.suspicion > 0.05
        ? 'rgba(255, 190, 60, 0.26)'
        : 'rgba(255, 220, 90, 0.16)',
    g.state === 'chase' ? 'rgba(255, 80, 80, 0.7)' : 'rgba(255, 220, 90, 0.45)',
  );
  // Body: dark uniform, pale face, cap.
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#2b3a4a';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = g.state === 'chase' ? '#ff5252' : '#7fa8c9';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(g.x + Math.cos(g.angle) * 5, g.y + Math.sin(g.angle) * 5, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#e8c39a';
  ctx.fill();
  // Suspicion arc above the head: the fair warning before the chase.
  if (g.suspicion > 0.03 && g.state !== 'chase') {
    ctx.beginPath();
    ctx.arc(g.x, g.y - 20, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.suspicion);
    ctx.strokeStyle = g.suspicion > 0.6 ? '#ff5252' : '#ffc94d';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (g.state === 'chase') {
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 22);
  }
}

function drawCamera(ctx, c) {
  if (!c.disabled) {
    drawCone(
      ctx,
      c.x,
      c.y,
      c.angle,
      c.range,
      CAMERA.visionHalfAngle,
      c.lock > 0.05 ? 'rgba(255, 90, 90, 0.24)' : 'rgba(120, 200, 255, 0.14)',
      c.lock > 0.05 ? 'rgba(255, 90, 90, 0.6)' : 'rgba(120, 200, 255, 0.4)',
    );
  }
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = c.disabled ? '#55606b' : '#3d4b5c';
  ctx.fillRect(-4, -6, 14, 12);
  ctx.fillStyle = c.disabled ? '#39424d' : c.lock > 0.05 ? '#ff5252' : '#ff3b30';
  ctx.beginPath();
  ctx.arc(11, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (c.disabled) {
    ctx.fillStyle = '#9fb3c8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFF', c.x, c.y - 14);
  }
}

function drawLoot(ctx, item, timeSec) {
  const bob = Math.sin(timeSec * 3 + item.x) * 2;
  if (item.kind === 'vault') {
    // The big prize: a glowing sapphire on a pedestal.
    ctx.beginPath();
    ctx.arc(item.x, item.y + 4, 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80, 160, 255, 0.18)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - 16 + bob);
    ctx.lineTo(item.x + 11, item.y - 2 + bob);
    ctx.lineTo(item.x, item.y + 12 + bob);
    ctx.lineTo(item.x - 11, item.y - 2 + bob);
    ctx.closePath();
    ctx.fillStyle = '#4db2ff';
    ctx.fill();
    ctx.strokeStyle = '#bfe4ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#eaf6ff';
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - 16 + bob);
    ctx.lineTo(item.x + 5, item.y - 4 + bob);
    ctx.lineTo(item.x, item.y - 1 + bob);
    ctx.lineTo(item.x - 5, item.y - 4 + bob);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd34d';
    ctx.fill();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(item.x - 2.5, item.y - 2.5 + bob, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff3c4';
    ctx.fill();
  }
}

function drawThief(ctx, thief) {
  // Soft shadow.
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();
  // Hooded figure: dark cloak, pale mask, gold trim.
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, thief.radius, 0, Math.PI * 2);
  ctx.fillStyle = thief.sneaking ? '#232a33' : '#2e3a49';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd34d';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(
    thief.x + Math.cos(thief.facing) * 4,
    thief.y + Math.sin(thief.facing) * 4,
    6.5,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = '#f2e6c9';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    thief.x + Math.cos(thief.facing) * 7,
    thief.y + Math.sin(thief.facing) * 7,
    2.5,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = '#1d2733';
  ctx.fill();
  if (thief.sneaking) {
    ctx.fillStyle = '#9fb3c8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', thief.x, thief.y - 20);
  }
}

function drawExit(ctx, exit, open, timeSec) {
  ctx.fillStyle = open ? '#1f6f43' : '#3a2f1d';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = open ? '#4ade80' : '#8a6d3b';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = open ? '#4ade80' : '#c9a86a';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  const pulse = open ? 0.7 + Math.sin(timeSec * 5) * 0.3 : 1;
  ctx.globalAlpha = pulse;
  // Keep the label inside the frame whichever edge the exit sits on.
  const labelX = Math.max(8, Math.min(exit.x, VIEW.width - 150));
  ctx.fillText(open ? 'EXIT OPEN — GO!' : 'EXIT LOCKED', labelX, exit.y + 30);
  ctx.globalAlpha = 1;
}

export function drawWorld(ctx, state, guards, cameras) {
  // Floor: checkerboard tiles with a subtle vignette.
  const tile = 48;
  for (let y = 0; y < VIEW.height; y += tile) {
    for (let x = 0; x < VIEW.width; x += tile) {
      ctx.fillStyle = ((x + y) / tile) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // Walls.
  for (const w of state.walls) {
    ctx.fillStyle = '#0e141b';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#33465c';
    ctx.fillRect(w.x, w.y, w.w, 4);
  }
  // Display-case plinths the walls already imply: faint floor markings.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 48; x < VIEW.width; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW.height);
    ctx.stroke();
  }

  drawExit(ctx, state.def.exit, state.exitOpen, state.timeSec);

  for (const item of state.loot) {
    if (!item.taken) drawLoot(ctx, item, state.timeSec);
  }
  // Smoke clouds hide everything under them, drawn after loot.
  for (const s of state.smoke) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 210, 220, 0.30)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x - 20, s.y + 10, s.radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 210, 220, 0.22)';
    ctx.fill();
  }
  for (const c of cameras) drawCamera(ctx, c);
  for (const g of guards) drawGuard(ctx, g);
  drawThief(ctx, state.thief);
}

function alarmColor(alarm) {
  if (alarm >= 70) return '#ff5252';
  if (alarm >= 40) return '#ffb02e';
  return '#4ade80';
}

export function drawHud(ctx, state, guards, cameras, levelIndex, levelCount, message) {
  const W = VIEW.width;
  // Top bar.
  ctx.fillStyle = 'rgba(8, 12, 17, 0.85)';
  ctx.fillRect(0, 0, W, 46);
  ctx.fillStyle = '#e8eef4';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `VAULTBREAK  ·  ${state.def.name}  (${levelIndex + 1}/${levelCount})`,
    14,
    19,
  );
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#9fb3c8';
  ctx.fillText(state.def.brief, 14, 37);

  // Alarm meter, top right.
  const mw = 190;
  const mx = W - mw - 14;
  ctx.fillStyle = '#0e141b';
  ctx.fillRect(mx, 10, mw, 14);
  ctx.fillStyle = alarmColor(state.alarm);
  ctx.fillRect(mx + 1, 11, (mw - 2) * (state.alarm / 100), 12);
  ctx.strokeStyle = '#55606b';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, 10, mw, 14);
  ctx.fillStyle = '#e8eef4';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ALARM ${Math.round(state.alarm)}%`, mx, 38);

  // Loot + tools + timer, bottom bar.
  ctx.fillStyle = 'rgba(8, 12, 17, 0.85)';
  ctx.fillRect(0, VIEW.height - 44, W, 44);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(
    `◆ $${state.lootValue.toLocaleString()}   Loot ${state.lootTaken}/${state.lootTotal}`,
    14,
    VIEW.height - 17,
  );
  ctx.fillStyle = '#9fb3c8';
  ctx.font = '12px sans-serif';
  const tools = [
    `[1] Coin ×${state.tools.coin}`,
    `[2] Smoke ×${state.tools.smoke}`,
    `[3] EMP ×${state.tools.emp}${state.empLeft > 0 ? ' (' + Math.ceil(state.empLeft) + 's)' : ''}`,
  ].join('    ');
  ctx.fillText(tools, 300, VIEW.height - 17);
  ctx.fillStyle = '#e8eef4';
  ctx.textAlign = 'right';
  const mm = Math.floor(state.timeSec / 60);
  const ss = Math.floor(state.timeSec % 60).toString().padStart(2, '0');
  ctx.fillText(`${mm}:${ss}  ·  WASD move · Shift sneak · Click: toss coin`, W - 14, VIEW.height - 17);
  ctx.textAlign = 'left';

  if (message) {
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = message.color;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 4;
    ctx.strokeText(message.text, W / 2, 84);
    ctx.fillText(message.text, W / 2, 84);
    ctx.textAlign = 'left';
  }
}

export function drawTitle(ctx, best) {
  ctx.fillStyle = '#101820';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Decorative vault door behind the title.
  ctx.beginPath();
  ctx.arc(VIEW.width / 2, 300, 150, 0, Math.PI * 2);
  ctx.fillStyle = '#1d2733';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#33465c';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(VIEW.width / 2, 300, 90, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VAULTBREAK', VIEW.width / 2, 150);
  ctx.fillStyle = '#9fb3c8';
  ctx.font = '18px sans-serif';
  ctx.fillText('A top-down stealth heist in three rooms', VIEW.width / 2, 185);
  ctx.fillStyle = '#e8eef4';
  ctx.font = '15px sans-serif';
  ctx.fillText('Slip past the guards. Dodge the cameras. Take the sapphire.', VIEW.width / 2, 470);
  ctx.fillText('Grab every loot, then reach the green EXIT before the alarm hits 100%.', VIEW.width / 2, 495);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('WASD / arrows to move · Shift to sneak · 1/2/3 or click for tools', VIEW.width / 2, 535);
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press ENTER or click to start the heist', VIEW.width / 2, 580);
  if (best > 0) {
    ctx.fillStyle = '#9fb3c8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Best take so far: $${best.toLocaleString()}`, VIEW.width / 2, 610);
  }
  ctx.textAlign = 'left';
}

export function drawEnd(ctx, kind, lines) {
  ctx.fillStyle = kind === 'win' ? 'rgba(10, 30, 18, 0.88)' : 'rgba(30, 10, 10, 0.88)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = kind === 'win' ? '#4ade80' : '#ff5252';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(kind === 'win' ? 'CLEAN GETAWAY' : kind === 'caught' ? 'CAUGHT!' : 'LOCKDOWN!', VIEW.width / 2, 220);
  ctx.fillStyle = '#e8eef4';
  ctx.font = '18px sans-serif';
  let y = 280;
  for (const line of lines) {
    ctx.fillText(line, VIEW.width / 2, y);
    y += 34;
  }
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Press ENTER to play again', VIEW.width / 2, y + 30);
  ctx.textAlign = 'left';
}
