// The bottom interactive grid of buckets.
//
// Each cell stores either null (empty — a "path square") or a bucket
// object: { color: 1..4 }.
//
// A bucket is UP iff flood-fill through 4-connected empty neighbors from
// the top row reaches one of its neighbors — meaning there is a clear path
// from the bucket up to the conveyor belt. Top-row buckets are always UP
// (directly adjacent to the belt).
//
// Up/down state is re-derived from the grid every time anything changes
// (a bucket leaves the grid). No need to mutate per-cell flags.

SL.bucketGrid = (function() {

  var cells = [];        // cells[y][x] = null or { color }
  var upFlags = [];      // upFlags[y][x] = boolean (derived)
  var cols = 0, rows = 0;

  function reset() {
    var c = SL.cfg;
    cols = c.gridBucketCols;
    rows = c.gridBucketRows;

    cells = [];
    for (var y = 0; y < rows; y++) {
      var row = [];
      var seed = c.gridSeed[y] || '';
      for (var x = 0; x < cols; x++) {
        var ch = seed.charAt(x) || '.';
        var idx = SL.parseSeedChar(ch);
        row.push(idx === 0 ? null : { color: idx });
      }
      cells.push(row);
    }

    recomputeUp();
  }

  // Flood-fill which empty cells are reachable from "above the top row".
  // Then mark each bucket UP if any neighbor (including above the top row)
  // is reachable.
  function recomputeUp() {
    var reachable = [];   // reachable[y][x] : boolean, only defined for empty cells
    for (var y = 0; y < rows; y++) {
      var r = [];
      for (var x = 0; x < cols; x++) r.push(false);
      reachable.push(r);
    }

    // BFS seeds: every empty cell in the top row is reachable.
    var queue = [];
    for (var x = 0; x < cols; x++) {
      if (cells[0][x] === null) {
        reachable[0][x] = true;
        queue.push([x, 0]);
      }
    }
    while (queue.length) {
      var p = queue.shift();
      var px = p[0], py = p[1];
      var dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (var i = 0; i < 4; i++) {
        var nx = px + dirs[i][0], ny = py + dirs[i][1];
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        if (cells[ny][nx] !== null) continue;     // must be empty
        if (reachable[ny][nx]) continue;
        reachable[ny][nx] = true;
        queue.push([nx, ny]);
      }
    }

    upFlags = [];
    for (var y = 0; y < rows; y++) {
      var row = [];
      for (var x = 0; x < cols; x++) {
        var b = cells[y][x];
        if (b === null) { row.push(false); continue; }
        // Top-row buckets are always UP (touch the conveyor).
        if (y === 0) { row.push(true); continue; }
        // Otherwise, any empty reachable 4-neighbor?
        var up = false;
        var dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for (var i = 0; i < 4; i++) {
          var nx = x + dirs[i][0], ny = y + dirs[i][1];
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          if (cells[ny][nx] === null && reachable[ny][nx]) { up = true; break; }
        }
        row.push(up);
      }
      upFlags.push(row);
    }
  }

  function cellRect(x, y) {
    var c = SL.cfg;
    var s = c.gridCellSize;
    return {
      x: c.gridX + x * s,
      y: c.gridY + y * s,
      w: s,
      h: s,
      cx: c.gridX + x * s + s / 2,
      cy: c.gridY + y * s + s / 2
    };
  }

  // Screen point -> grid cell coords (or null).
  function pointToCell(px, py) {
    var c = SL.cfg;
    var s = c.gridCellSize;
    var x = Math.floor((px - c.gridX) / s);
    var y = Math.floor((py - c.gridY) / s);
    if (x < 0 || x >= cols || y < 0 || y >= rows) return null;
    return { x: x, y: y };
  }

  // Tap handler — called from game.js onPointerDown.
  // Returns true if the tap produced a game action (so game.js knows
  // not to pass it to other systems).
  function handleTap(px, py) {
    var cell = pointToCell(px, py);
    if (!cell) return false;
    var b = cells[cell.y][cell.x];
    if (!b) return false;
    if (!upFlags[cell.y][cell.x]) {
      // Shake feedback.
      spawnEntity('bucket_shake', { gx: cell.x, gy: cell.y, reason: 'down' });
      return true;
    }
    if (SL.conveyor.freeSlotCount() <= 0) {
      spawnEntity('bucket_shake', { gx: cell.x, gy: cell.y, reason: 'belt_full' });
      return true;
    }

    // Remove from grid.
    cells[cell.y][cell.x] = null;
    recomputeUp();

    // Spawn flying bucket.
    var r = cellRect(cell.x, cell.y);
    var landingX = SL.conveyor.nextLandingX();
    var landingY = SL.cfg.conveyorY + SL.cfg.conveyorH / 2;
    spawnEntity('bucket_flight', {
      x: r.cx, y: r.cy,
      sx: r.cx, sy: r.cy,
      tx: landingX, ty: landingY,
      color: b.color,
      t: 0
    });
    return true;
  }

  function draw(ctx) {
    var c = SL.cfg;

    // Floor backdrop.
    ctx.fillStyle = '#e4ecf2';
    roundRect(ctx, c.gridX - 10, c.gridY - 10, cols * c.gridCellSize + 20, rows * c.gridCellSize + 20, 16);
    ctx.fill();
    ctx.strokeStyle = '#aebac5';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Empty cells.
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var r = cellRect(x, y);
        if (cells[y][x] === null) {
          ctx.fillStyle = '#d6dee6';
          roundRect(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 6);
          ctx.fill();
        }
      }
    }

    // Buckets.
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var b = cells[y][x];
        if (!b) continue;
        var r = cellRect(x, y);
        var up = upFlags[y][x];
        drawGridBucket(ctx, r.cx, r.cy, r.w * 0.78, r.h * 0.78, b.color, up);
      }
    }
  }

  function drawGridBucket(ctx, cx, cy, w, h, colorIdx, up) {
    var base = SL.colorAt(colorIdx);
    var color = up ? base : desaturate(base, 0.55);
    var dark = SL.conveyor._shade(color, -0.3);

    ctx.save();
    if (!up) {
      // Flip vertically around cy.
      ctx.translate(0, cy);
      ctx.scale(1, -1);
      ctx.translate(0, -cy);
    }

    // Body (trapezoid).
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2 - 8, cy + h / 2);
    ctx.lineTo(cx - w / 2 + 8, cy + h / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner opening (darker ellipse at the top).
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(cx, cy - h / 2, w / 2 - 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rim highlight.
    ctx.fillStyle = SL.conveyor._shade(color, 0.2);
    ctx.fillRect(cx - w / 2 + 2, cy - h / 2 - 3, w - 4, 4);

    ctx.restore();
  }

  function desaturate(hex, amt) {
    // amt 0..1, 0 = unchanged, 1 = fully grey.
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var grey = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
    r = Math.round(r + (grey - r) * amt);
    g = Math.round(g + (grey - g) * amt);
    b = Math.round(b + (grey - b) * amt);
    function hx(c) { return (c < 16 ? '0' : '') + c.toString(16); }
    return '#' + hx(r) + hx(g) + hx(b);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return {
    reset: reset,
    draw: draw,
    handleTap: handleTap,
    recomputeUp: recomputeUp,
    cellRect: cellRect
  };
})();
