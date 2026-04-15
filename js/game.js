// Sandloop — boot, main loop, input dispatch.
//
// Keep this file small. Each system (sand, conveyor, bucket grid, debug)
// owns its own file. This file just wires them together.

function init() {
  // Build the debug panel FIRST so it can load saved config from
  // localStorage before we size the canvas or seed the world.
  SL.debugPanel.build();
  SL.debugPanel.loadFromStorage();

  canvas = document.getElementById('game');
  canvas.width = SL.cfg.canvasW;
  canvas.height = SL.cfg.canvasH;
  ctx = canvas.getContext('2d');
  W = canvas.width;
  H = canvas.height;

  SL.sandfield.reset(SL.cfg.gridCols, SL.cfg.gridRows);
  SL.conveyor.reset();
  SL.bucketGrid.reset();

  canvas.addEventListener('pointerdown', onPointerDown);

  lastT = performance.now();
  requestAnimationFrame(frame);
}

function canvasCoords(ev) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - rect.left) * (W / rect.width),
    y: (ev.clientY - rect.top) * (H / rect.height)
  };
}

function onPointerDown(ev) {
  var p = canvasCoords(ev);
  SL.bucketGrid.handleTap(p.x, p.y);
}

function update(dt) {
  tick++;

  // Sand physics — run once per frame. (For stronger flow, could run
  // multiple substeps; 60fps feels good for now.)
  SL.sandfield.step();
  SL.conveyor.step(dt);

  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    var def = getEntityType(e.type);
    if (def && def.update) def.update(e, dt);
  }
  var alive = [];
  for (var i = 0; i < entities.length; i++) {
    if (!entities[i].dead) alive.push(entities[i]);
  }
  entities = alive;

  // Win check.
  if (SL.state === 'playing' && SL.sandfield.isEmpty()) {
    SL.state = 'won';
  }
  SL.debugPanel.updateWinUI();
}

function render() {
  // Background.
  ctx.fillStyle = '#0f1520';
  ctx.fillRect(0, 0, W, H);

  // Top HUD strip (thin, just to frame the image). Kept minimal in core.
  ctx.fillStyle = '#1a2130';
  ctx.fillRect(0, 0, W, SL.cfg.imageY - 10);

  // Title.
  ctx.fillStyle = '#eef2f8';
  ctx.font = '700 26px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SANDLOOP', W / 2, (SL.cfg.imageY - 10) / 2);

  // Systems.
  SL.sandfield.draw(ctx);
  SL.conveyor.draw(ctx);
  SL.bucketGrid.draw(ctx);

  // Entities (flying buckets, sand streams, shakes).
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    var def = getEntityType(e.type);
    if (def && def.draw) def.draw(ctx, e);
  }

  // Progress readout (grains remaining).
  var remaining = SL.totalGrains - SL.grainsCollected;
  var pct = SL.totalGrains > 0 ? (100 * SL.grainsCollected / SL.totalGrains) : 0;
  ctx.fillStyle = '#cad3df';
  ctx.font = '600 14px Fredoka, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Grains left: ' + remaining + '  (' + pct.toFixed(0) + '%)',
               W - 12, 8);
}

function frame(now) {
  var dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener('load', init);
