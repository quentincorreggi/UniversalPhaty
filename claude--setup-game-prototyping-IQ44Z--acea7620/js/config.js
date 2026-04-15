// Global game state and constants for Sandloop.
//
// Everything tunable from the debug panel (D key) lives in SL.cfg.
// If you tweak values in the debug panel, use "Copy values" to dump a
// JS snippet you can paste back in here to update the defaults.

var canvas = null;   // the <canvas> element
var ctx = null;      // its 2D rendering context
var W = 0;           // canvas width, in pixels
var H = 0;           // canvas height, in pixels

var entities = [];   // active entities (flying buckets, sand streams, fx)
var tick = 0;        // frame counter
var lastT = 0;       // last frame timestamp (for dt)

// ---------------------------------------------------------------------------
// Sandloop namespace. One top-level global to keep things tidy.
// ---------------------------------------------------------------------------
var SL = {};

// Palette — indices are used across the grid and sand field.
// 0 is reserved for "empty / background".
SL.palette = {
  background: '#1e2a3a',  // dark slate (empty sand cells, canvas bg)
  colors: [
    null,          // 0 — empty
    '#e94f4f',     // 1 — red
    '#3ecfd8',     // 2 — cyan
    '#ffc545',     // 3 — yellow
    '#3d7dff'      // 4 — blue
  ]
};

// ---------------------------------------------------------------------------
// Default layout + tunables. Every field here is editable live from the
// debug panel (press D). localStorage auto-persists across reloads.
// ---------------------------------------------------------------------------
SL.cfgDefault = {
  // Canvas logical size (portrait, mobile-shaped). CSS scales it to fit.
  canvasW: 540,
  canvasH: 960,

  // The sand image box on screen (where the pixel art lives).
  imageX: 30,
  imageY: 70,
  imageW: 480,
  imageH: 480,

  // Sand grid resolution. Cells = gridCols * gridRows. 200x200 = 40k cells,
  // which runs comfortably at 60fps. Bump up to 500 once confirmed.
  gridCols: 200,
  gridRows: 200,

  // Conveyor belt (directly below the image).
  conveyorX: 30,
  conveyorY: 570,
  conveyorW: 480,
  conveyorH: 80,
  conveyorSlots: 5,
  conveyorSpeed: 60,   // pixels/sec, left -> right

  // Bucket grid (interactive bottom panel).
  gridX: 30,
  gridY: 680,
  gridCellSize: 88,
  gridBucketCols: 5,
  gridBucketRows: 3,

  // Suction.
  suctionRadius: 25,        // in image-cell units (not screen pixels)
  bucketCapacity: 100,      // grains before a bucket disappears
  suctionPerFrame: 4,       // max grains sucked per frame per bucket

  // Bucket flight (grid -> conveyor).
  flightDuration: 0.35,     // seconds for the hop
  flightArc: 120,           // height of parabola, pixels

  // Bucket grid initial seed (mix of colors and empty cells).
  // Each row is a string: '.' = empty, '1'..'4' = palette color index.
  // Top row is adjacent to the conveyor. Must be gridBucketRows rows long
  // and each row exactly gridBucketCols chars.
  gridSeed: [
    '42.31',
    '.3.2.',
    '31421'
  ],

  // Visual tweaks.
  sandPixelScale: 1,        // draw scale per sand cell (1 = densest)
  belowImageMargin: 10,     // px gap between image and conveyor
};

// Live config starts as a shallow copy of the default. Debug panel mutates
// this; renderers/update code should always read from SL.cfg (not cfgDefault).
SL.cfg = {};
for (var k in SL.cfgDefault) {
  if (SL.cfgDefault.hasOwnProperty(k)) {
    var v = SL.cfgDefault[k];
    SL.cfg[k] = (Object.prototype.toString.call(v) === '[object Array]') ? v.slice() : v;
  }
}

// Overall game state: 'playing' | 'won'.
SL.state = 'playing';

// Total grains in the image at start (for win check).
SL.totalGrains = 0;
SL.grainsCollected = 0;
