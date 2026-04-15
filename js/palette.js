// Palette helpers. Color 0 is always "empty".
//
// SL.palette.colors is the source of truth. Everywhere else refers to
// colors by integer index (uint8-friendly — lets the sand grid be a flat
// Uint8Array).

SL.colorAt = function(idx) {
  return SL.palette.colors[idx] || SL.palette.background;
};

SL.colorCount = function() {
  // exclude index 0 (empty)
  return SL.palette.colors.length - 1;
};

// Parse a seed character from cfg.gridSeed:
//   '.' => 0 (empty cell)
//   '?' => random non-zero color  (kept here as a tiny convenience;
//          the '?' mystery-bucket mechanic itself is out-of-scope for core)
//   '1'..'9' => that palette index
SL.parseSeedChar = function(ch) {
  if (ch === '.' || ch === ' ') return 0;
  if (ch === '?') {
    var n = SL.colorCount();
    return 1 + Math.floor(Math.random() * n);
  }
  var n = parseInt(ch, 10);
  if (isNaN(n) || n < 0 || n >= SL.palette.colors.length) return 0;
  return n;
};
