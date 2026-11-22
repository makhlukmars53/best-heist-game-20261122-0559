// VAULTBREAK — input.js
// One clear job: keyboard and mouse, nothing else. Tracks held keys, the
// mouse position over the canvas, clicks, and one-shot key presses.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 },
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!e.repeat) input.pressed.add(e.key.toLowerCase());
    input.keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.clickX = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouse.clickY = ((e.clientY - r.top) / r.height) * canvas.height;
    input.mouse.clicked = true;
  });

  return input;
}

export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('a') || input.keys.has('arrowleft')) x -= 1;
  if (input.keys.has('d') || input.keys.has('arrowright')) x += 1;
  if (input.keys.has('w') || input.keys.has('arrowup')) y -= 1;
  if (input.keys.has('s') || input.keys.has('arrowdown')) y += 1;
  if (x !== 0 && y !== 0) {
    const len = Math.hypot(x, y);
    x /= len;
    y /= len;
  }
  return { x, y };
}

export function isSneaking(input) {
  return input.keys.has('shift');
}

// True once for a key pressed since the last frame; callers clear it.
export function wasPressed(input, key) {
  return input.pressed.has(key.toLowerCase());
}

export function endFrame(input) {
  input.pressed.clear();
  input.mouse.clicked = false;
}
