// The falling-sand pixel grid that makes up the top image.
//
// Data model: a flat Uint8Array of length cols*rows. Each cell stores a
// palette index (0 = empty, 1..N = color).
//
// Rendering: we maintain a small offscreen canvas at cols x rows, write
// ImageData into it, then draw it scaled up into the image box. This is
// the fastest way to show a big pixel grid on screen (no per-cell fill).

SL.sandfield = (function() {

  var cols = 0, rows = 0;
  var grid = null;        // Uint8Array, cols*rows
  var tmp = null;         // Uint8Array scratch (unused for now, kept for expansion)
  var offscreen = null;   // small <canvas> for ImageData blit
  var offCtx = null;
  var imageData = null;

  function reset(newCols, newRows) {
    cols = newCols;
    rows = newRows;
    grid = new Uint8Array(cols * rows);

    offscreen = document.createElement('canvas');
    offscreen.width = cols;
    offscreen.height = rows;
    offCtx = offscreen.getContext('2d');
    imageData = offCtx.createImageData(cols, rows);

    generateTestPattern();
    countTotalGrains();
  }

  // A procedural "pixel art" pattern. Four color wedges around a central
  // dot — just something colorful to dig through until the user drops in
  // a real PNG. Every cell is non-empty so there is plenty to collect.
  function generateTestPattern() {
    var cx = cols / 2, cy = rows / 2;
    var rmax = Math.min(cx, cy);
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var dx = x - cx, dy = y - cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var ang = Math.atan2(dy, dx);          // -PI..PI
        var wedge = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 4);
        if (wedge < 0) wedge = 0;
        if (wedge > 3) wedge = 3;

        var color = (wedge % 4) + 1;           // 1..4

        // Ring accents: small bands swap colors to add texture.
        var ringBand = Math.floor(d / 14) % 4;
        if (ringBand === 2) color = ((color) % 4) + 1;

        // Central "core" uses a fixed color.
        if (d < rmax * 0.18) color = 3;        // yellow core

        grid[y * cols + x] = color;
      }
    }
  }

  function countTotalGrains() {
    var n = 0;
    for (var i = 0; i < grid.length; i++) if (grid[i] !== 0) n++;
    SL.totalGrains = n;
    SL.grainsCollected = 0;
  }

  // One physics step. Bottom-up so a moved cell isn't re-processed.
  // Each filled cell tries: straight down -> down-left -> down-right.
  // Empty cells below are flooded with the grain above.
  function step() {
    for (var y = rows - 2; y >= 0; y--) {
      // Alternate left/right bias per row to avoid visual tilt.
      var leftFirst = ((y + tick) & 1) === 0;
      for (var xi = 0; xi < cols; xi++) {
        var x = leftFirst ? xi : (cols - 1 - xi);
        var i = y * cols + x;
        var v = grid[i];
        if (v === 0) continue;

        var below = i + cols;
        if (grid[below] === 0) {
          grid[below] = v;
          grid[i] = 0;
          continue;
        }
        // try diagonals
        var dl = (x > 0) ? (below - 1) : -1;
        var dr = (x < cols - 1) ? (below + 1) : -1;
        var preferLeft = ((x + y + tick) & 1) === 0;
        var a = preferLeft ? dl : dr;
        var b = preferLeft ? dr : dl;
        if (a >= 0 && grid[a] === 0) {
          grid[a] = v; grid[i] = 0; continue;
        }
        if (b >= 0 && grid[b] === 0) {
          grid[b] = v; grid[i] = 0; continue;
        }
      }
    }
  }

  // Suction query.
  // Input: (cxCell, cyCell) center in cell coords, radius in cells,
  // colorIdx to suck, maxGrains cap.
  // Returns: array of {x, y, color} cell positions that were cleared.
  function suck(cxCell, cyCell, radius, colorIdx, maxGrains) {
    var taken = [];
    if (maxGrains <= 0) return taken;
    var r2 = radius * radius;
    var x0 = Math.max(0, Math.floor(cxCell - radius));
    var x1 = Math.min(cols - 1, Math.ceil(cxCell + radius));
    var y0 = Math.max(0, Math.floor(cyCell - radius));
    var y1 = Math.min(rows - 1, Math.ceil(cyCell + radius));

    for (var y = y0; y <= y1 && taken.length < maxGrains; y++) {
      for (var x = x0; x <= x1 && taken.length < maxGrains; x++) {
        var i = y * cols + x;
        if (grid[i] !== colorIdx) continue;
        var dx = x - cxCell, dy = y - cyCell;
        if (dx * dx + dy * dy > r2) continue;
        grid[i] = 0;
        taken.push({ x: x, y: y, color: colorIdx });
      }
    }
    SL.grainsCollected += taken.length;
    return taken;
  }

  // Draw into the image box. Uses an offscreen canvas so we do ONE
  // drawImage per frame (cheap) instead of cols*rows fillRects.
  function draw(ctx) {
    // Write ImageData from grid.
    var data = imageData.data;
    var bg = SL.palette.background;
    // Parse bg once.
    var bgR = parseInt(bg.slice(1, 3), 16);
    var bgG = parseInt(bg.slice(3, 5), 16);
    var bgB = parseInt(bg.slice(5, 7), 16);

    // Pre-parse palette RGB.
    var rgb = [];
    for (var i = 0; i < SL.palette.colors.length; i++) {
      var c = SL.palette.colors[i];
      if (!c) { rgb.push(null); continue; }
      rgb.push([
        parseInt(c.slice(1, 3), 16),
        parseInt(c.slice(3, 5), 16),
        parseInt(c.slice(5, 7), 16)
      ]);
    }

    for (var p = 0; p < grid.length; p++) {
      var v = grid[p];
      var off = p * 4;
      if (v === 0) {
        data[off]     = bgR;
        data[off + 1] = bgG;
        data[off + 2] = bgB;
        data[off + 3] = 255;
      } else {
        var c = rgb[v];
        data[off]     = c[0];
        data[off + 1] = c[1];
        data[off + 2] = c[2];
        data[off + 3] = 255;
      }
    }
    offCtx.putImageData(imageData, 0, 0);

    // Blit scaled into the image box.
    var c = SL.cfg;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, c.imageX, c.imageY, c.imageW, c.imageH);
    ctx.restore();

    // Frame around the image for that "display panel" look.
    ctx.strokeStyle = '#9fb4c9';
    ctx.lineWidth = 4;
    ctx.strokeRect(c.imageX - 2, c.imageY - 2, c.imageW + 4, c.imageH + 4);
  }

  // Convert a screen X on the conveyor to the column in sand-grid coords.
  // Used by the conveyor to compute where buckets are sucking from.
  function screenXtoCell(screenX) {
    var c = SL.cfg;
    var u = (screenX - c.imageX) / c.imageW;   // 0..1
    return Math.max(0, Math.min(cols - 1, Math.floor(u * cols)));
  }

  // The suction column is "just above the conveyor", which maps to the
  // bottom edge of the sand image. Use a row slightly above bottom so
  // the suction circle doesn't get cut off.
  function bottomCellRow() {
    return rows - 1;
  }

  // Expose.
  return {
    reset: reset,
    step: step,
    suck: suck,
    draw: draw,
    screenXtoCell: screenXtoCell,
    bottomCellRow: bottomCellRow,
    getCols: function() { return cols; },
    getRows: function() { return rows; },
    isEmpty: function() { return SL.grainsCollected >= SL.totalGrains; }
  };
})();
