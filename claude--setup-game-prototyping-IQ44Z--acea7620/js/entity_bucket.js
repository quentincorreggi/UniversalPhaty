// Entities tied to bucket movement:
//   'bucket_flight'  — the ~300ms parabolic hop from grid cell onto the
//                      conveyor. When it lands, it hands off to
//                      SL.conveyor.addBucket and disappears.
//   'bucket_shake'   — a tiny non-moving fx that flashes the tapped
//                      cell when the bucket can't be sent (path blocked
//                      or belt full).

registerEntityType('bucket_flight', {
  init: function(e) {
    e.duration = SL.cfg.flightDuration;
    e.arc = SL.cfg.flightArc;
  },
  update: function(e, dt) {
    e.t += dt;
    var p = Math.min(1, e.t / e.duration);
    // Ease-out on the way up, ease-in on the way down — just a smooth
    // parabola: y = sx*(1-p) + tx*p - arc * 4 * p * (1-p).
    e.x = e.sx + (e.tx - e.sx) * p;
    e.y = e.sy + (e.ty - e.sy) * p - e.arc * 4 * p * (1 - p);

    if (p >= 1) {
      SL.conveyor.addBucket(e.color, e.tx);
      e.dead = true;
    }
  },
  draw: function(ctx, e) {
    var color = SL.colorAt(e.color);
    var w = 52, h = 42;
    ctx.save();
    var spin = (e.t / e.duration) * Math.PI * 0.25;
    ctx.translate(e.x, e.y);
    ctx.rotate(spin);
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(w / 2 - 5, h / 2);
    ctx.lineTo(-w / 2 + 5, h / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = SL.conveyor._shade(color, -0.3);
    ctx.lineWidth = 2;
    ctx.stroke();
    // Rim.
    ctx.fillStyle = SL.conveyor._shade(color, -0.35);
    ctx.beginPath();
    ctx.ellipse(0, -h / 2, w / 2 - 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
});

registerEntityType('bucket_shake', {
  init: function(e) {
    e.life = 0.25;
    e.t = 0;
  },
  update: function(e, dt) {
    e.t += dt;
    if (e.t >= e.life) e.dead = true;
  },
  draw: function(ctx, e) {
    var r = SL.bucketGrid.cellRect(e.gx, e.gy);
    var shake = Math.sin(e.t * 60) * 3 * (1 - e.t / e.life);
    ctx.save();
    ctx.translate(shake, 0);
    ctx.strokeStyle = (e.reason === 'belt_full') ? '#ffb429' : '#ff4060';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1 - e.t / e.life;
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
});
