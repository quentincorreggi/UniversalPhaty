// Example entity type — a colorful ball that launches upward and falls
// with gravity. Exists only to prove the registry + game loop are wired
// up. Delete this file (and its <script> tag in index.html) once your
// own entities take over.

registerEntityType('demo', {
  init: function(e) {
    e.vx = (Math.random() - 0.5) * 240;
    e.vy = -220 - Math.random() * 120;
    e.r = 10 + Math.random() * 8;
    e.hue = Math.floor(Math.random() * 360);
    e.life = 3.0;
  },
  update: function(e, dt) {
    e.vy += 640 * dt;           // gravity
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.life -= dt;
    if (e.life <= 0 || e.y > H + 40) e.dead = true;
  },
  draw: function(ctx, e) {
    var alpha = Math.min(1, e.life);
    ctx.fillStyle = 'hsla(' + e.hue + ', 70%, 60%, ' + alpha + ')';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
  }
});
