// Visual-only particle: a single grain of sand falling from the image
// into a bucket on the belt. Spawned one per sucked cell.
//
// The particle travels from its removed-cell position to the belt bucket's
// current position via a parabolic arc, then disappears. The actual grain
// count/fill tracking happens in conveyor.js at the moment of suction —
// this entity is purely cosmetic.

registerEntityType('sandstream', {
  init: function(e) {
    e.life = 0.22 + Math.random() * 0.08;
    e.t = 0;
    e.sx = e.x;
    e.sy = e.y;
    // Tiny random offset at target so the stream looks like a stream,
    // not a single laser.
    e.tx += (Math.random() - 0.5) * 16;
    e.ty += (Math.random() - 0.5) * 8;
    e.size = 2 + Math.random() * 1.5;
  },
  update: function(e, dt) {
    e.t += dt;
    var p = Math.min(1, e.t / e.life);
    e.x = e.sx + (e.tx - e.sx) * p;
    e.y = e.sy + (e.ty - e.sy) * p - 24 * p * (1 - p); // slight arc
    if (p >= 1) e.dead = true;
  },
  draw: function(ctx, e) {
    ctx.fillStyle = SL.colorAt(e.color);
    ctx.fillRect(e.x | 0, e.y | 0, e.size, e.size);
  }
});
