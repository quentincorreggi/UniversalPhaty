// Game loop, input, and boot.
//
// Keep this file small. New mechanics should either register themselves
// as entity types (see registry.js) or get their own file with a hook
// added here into update() / render() / input.

function init() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  W = canvas.width;
  H = canvas.height;

  canvas.addEventListener('pointerdown', onPointerDown);

  lastT = performance.now();
  requestAnimationFrame(frame);
}

// Convert a DOM pointer event into canvas coordinates.
function canvasCoords(ev) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - rect.left) * (W / rect.width),
    y: (ev.clientY - rect.top) * (H / rect.height)
  };
}

function onPointerDown(ev) {
  var p = canvasCoords(ev);
  // Starter behavior: click spawns a demo entity. Replace this with
  // whatever input your game needs.
  spawnEntity('demo', { x: p.x, y: p.y });
}

function update(dt) {
  tick++;
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    var def = getEntityType(e.type);
    if (def && def.update) def.update(e, dt);
  }
  // Sweep out dead entities.
  var alive = [];
  for (var i = 0; i < entities.length; i++) {
    if (!entities[i].dead) alive.push(entities[i]);
  }
  entities = alive;
}

function render() {
  ctx.fillStyle = '#1f1f24';
  ctx.fillRect(0, 0, W, H);

  // Friendly hint when the world is empty.
  if (entities.length === 0) {
    ctx.fillStyle = '#6a6a73';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('UniversalPhaty starter — click to spawn', W / 2, H / 2 - 6);
    ctx.fillStyle = '#4a4a53';
    ctx.font = '12px sans-serif';
    ctx.fillText('Describe a mechanic to Claude to begin building your game', W / 2, H / 2 + 14);
  }

  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    var def = getEntityType(e.type);
    if (def && def.draw) def.draw(ctx, e);
  }
}

function frame(now) {
  // Clamp dt to avoid huge jumps when the tab was backgrounded.
  var dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener('load', init);
