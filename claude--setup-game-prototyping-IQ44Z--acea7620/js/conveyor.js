// Conveyor belt under the sand image.
//
// Holds up to cfg.conveyorSlots buckets. Buckets slide left -> right at
// cfg.conveyorSpeed px/sec. A bucket that exits the right side loops to
// the left (mostly cosmetic — usually buckets fill up and disappear first).
//
// Each frame we ask the sand field to suck grains from the bucket's column,
// up to cfg.suctionPerFrame per bucket. Full buckets vanish.
//
// A bucket on the belt is just a plain object:
//   { color: 1..4, x: screen-x of center, fill: 0..cap, dead?: true }

SL.conveyor = (function() {

  var buckets = [];    // active belt buckets, sorted by x

  function reset() {
    buckets = [];
  }

  function freeSlotCount() {
    return Math.max(0, SL.cfg.conveyorSlots - buckets.length);
  }

  // Returns a target landing X (screen coords) for a new bucket arriving
  // at the belt. We place each incoming bucket into evenly spaced slots
  // starting from the left. Returns null if no room.
  function nextLandingX() {
    var c = SL.cfg;
    if (buckets.length >= c.conveyorSlots) return null;
    // Spread across the belt. Slot i center:
    var slotW = c.conveyorW / c.conveyorSlots;
    // Find the leftmost "slot-x" that isn't close to any existing bucket.
    for (var s = 0; s < c.conveyorSlots; s++) {
      var sx = c.conveyorX + slotW * (s + 0.5);
      var clash = false;
      for (var i = 0; i < buckets.length; i++) {
        if (Math.abs(buckets[i].x - sx) < slotW * 0.6) { clash = true; break; }
      }
      if (!clash) return sx;
    }
    // Fallback: leftmost.
    return c.conveyorX + slotW * 0.5;
  }

  // Called by bucket_grid after a grid bucket animates onto the belt.
  function addBucket(color, x) {
    buckets.push({ color: color, x: x, fill: 0 });
    buckets.sort(function(a, b) { return a.x - b.x; });
  }

  function step(dt) {
    var c = SL.cfg;
    var beltRight = c.conveyorX + c.conveyorW;
    var beltLeft  = c.conveyorX;

    for (var i = 0; i < buckets.length; i++) {
      var b = buckets[i];
      b.x += c.conveyorSpeed * dt;
      if (b.x > beltRight + 40) b.x = beltLeft - 40;   // wrap

      // Suction: only if we're under the image horizontally AND not full.
      if (b.fill < c.bucketCapacity &&
          b.x >= c.imageX && b.x <= c.imageX + c.imageW) {
        var cellX = SL.sandfield.screenXtoCell(b.x);
        var cellY = SL.sandfield.bottomCellRow();
        var taken = SL.sandfield.suck(
          cellX, cellY, c.suctionRadius, b.color,
          Math.min(c.suctionPerFrame, c.bucketCapacity - b.fill)
        );
        b.fill += taken.length;

        // Spawn visual stream particles for each removed grain.
        for (var k = 0; k < taken.length; k++) {
          var t = taken[k];
          var screenX = c.imageX + (t.x + 0.5) * (c.imageW / SL.sandfield.getCols());
          var screenY = c.imageY + (t.y + 0.5) * (c.imageH / SL.sandfield.getRows());
          spawnEntity('sandstream', {
            x: screenX, y: screenY,
            tx: b.x, ty: c.conveyorY + c.conveyorH * 0.5,
            color: t.color
          });
        }
      }

      if (b.fill >= c.bucketCapacity) b.dead = true;
    }

    // Remove dead buckets.
    var alive = [];
    for (var j = 0; j < buckets.length; j++) if (!buckets[j].dead) alive.push(buckets[j]);
    buckets = alive;
  }

  function draw(ctx) {
    var c = SL.cfg;

    // Belt surface.
    ctx.fillStyle = '#cdd6e0';
    roundRect(ctx, c.conveyorX, c.conveyorY, c.conveyorW, c.conveyorH, 12);
    ctx.fill();

    // Side "rollers".
    ctx.fillStyle = '#8896a4';
    ctx.beginPath();
    ctx.arc(c.conveyorX + 10, c.conveyorY + c.conveyorH / 2, c.conveyorH * 0.55, 0, Math.PI * 2);
    ctx.arc(c.conveyorX + c.conveyorW - 10, c.conveyorY + c.conveyorH / 2, c.conveyorH * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Moving tread hash marks.
    var treadOffset = (SL.cfg.conveyorSpeed * (lastT / 1000)) % 16;
    ctx.strokeStyle = '#a3b0bd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var x = c.conveyorX - 16 + treadOffset; x < c.conveyorX + c.conveyorW; x += 16) {
      ctx.moveTo(x, c.conveyorY + c.conveyorH * 0.35);
      ctx.lineTo(x + 8, c.conveyorY + c.conveyorH * 0.35);
      ctx.moveTo(x + 4, c.conveyorY + c.conveyorH * 0.65);
      ctx.lineTo(x + 12, c.conveyorY + c.conveyorH * 0.65);
    }
    ctx.stroke();

    // Buckets.
    for (var i = 0; i < buckets.length; i++) {
      var b = buckets[i];
      drawBeltBucket(ctx, b.x, c.conveyorY + c.conveyorH / 2, b);
    }
  }

  function drawBeltBucket(ctx, cx, cy, b) {
    var c = SL.cfg;
    var w = Math.min(c.conveyorW / c.conveyorSlots * 0.72, 70);
    var h = Math.min(c.conveyorH * 0.78, 56);
    var color = SL.colorAt(b.color);

    // Bucket body (trapezoid-ish).
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2 - 6, cy + h / 2);
    ctx.lineTo(cx - w / 2 + 6, cy + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(color, -0.25);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rim highlight.
    ctx.fillStyle = shade(color, 0.15);
    ctx.fillRect(cx - w / 2 + 1, cy - h / 2, w - 2, 6);

    // Fill indicator label.
    var pct = Math.round(100 * b.fill / c.bucketCapacity);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    ctx.font = '600 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var label = pct + '%';
    ctx.strokeText(label, cx, cy + 2);
    ctx.fillText(label, cx, cy + 2);
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

  function shade(hex, amt) {
    // amt in [-1..1]. Negative darkens, positive lightens.
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    function mix(c) {
      if (amt >= 0) return Math.round(c + (255 - c) * amt);
      return Math.round(c * (1 + amt));
    }
    var rr = mix(r), gg = mix(g), bb = mix(b);
    return '#' +
      (rr < 16 ? '0' : '') + rr.toString(16) +
      (gg < 16 ? '0' : '') + gg.toString(16) +
      (bb < 16 ? '0' : '') + bb.toString(16);
  }

  return {
    reset: reset,
    step: step,
    draw: draw,
    addBucket: addBucket,
    nextLandingX: nextLandingX,
    freeSlotCount: freeSlotCount,
    // expose helper for debug panel
    _shade: shade
  };
})();
