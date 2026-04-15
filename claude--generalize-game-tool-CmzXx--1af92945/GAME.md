# Game: Marble Sorter

This document describes the specific game currently installed in this
UniversalPhaty repo. If you are forking UniversalPhaty to build a
different game, **replace this entire file** with a description of your
own game. The rules in `PLATFORM.md` stay the same; this file is the part
that changes per game.

## What the Game Is

Marble Sorter is a grid-based puzzle game. The player taps revealed boxes
on a 7×7 grid; each tap spawns colored marbles that fall through a funnel
onto a conveyor belt. The belt carries marbles past four sort columns at
the bottom; a marble jumps into its matching color column. Fill all four
columns to win.

## Suggestion Seeds for New Mechanics

If the user is unsure what to prototype, offer ideas like:
- A box type that teleports marbles to a random position
- A "bomb" box that destroys adjacent boxes when tapped
- Marbles that split in two when they hit the funnel wall
- A "magnet" sort column that attracts matching marbles faster
- A time-pressure mode where the belt speeds up over time

## Tech Stack

- Vanilla JavaScript, HTML5 Canvas, Web Audio API
- No dependencies, no build step — runs directly in browser via
  `index.html`
- ~3300 lines across 17 JS files

## File Map

| File | Purpose | Lines |
|------|---------|-------|
| `index.html` | Entry point, loads all JS in order, CSS + HTML | 269 |
| `js/config.js` | Global state, constants, COLORS, physics params | 108 |
| `js/registry.js` | Box type registration (`registerBoxType` / `getBoxType`) | 32 |
| `js/box_default.js` | Default box — drawClosed, drawReveal, editor hooks | 65 |
| `js/box_hidden.js` | Hidden "?" box — color unknown until revealed | 73 |
| `js/box_ice.js` | Ice box — requires 2 adjacent taps to shatter ice first | 160 |
| `js/box_blocker.js` | Blocker box — spawns neutral gray marbles that jam the belt | 127 |
| `js/game.js` | Game loop, init, update, input, win check | 585 |
| `js/physics.js` | Marble physics — gravity, collision, funnel walls, belt entry | 136 |
| `js/rendering.js` | Core drawing — boxes, marbles, funnel, belt, sort area | 469 |
| `js/layout.js` | Layout computation — stock grid, funnel, belt path, sort area | 128 |
| `js/belt.js` | Belt slot init and position helpers | 37 |
| `js/tunnel.js` | Tunnel mechanic — hidden box queue, spawns into adjacent cell | 219 |
| `js/wall.js` | Wall cell — inert structural blocker | 96 |
| `js/editor.js` | Level editor UI — grid painting, toolbar, import/export JSON | 653 |
| `js/particles.js` | Particle effects (bursts, confetti) | 42 |
| `js/audio.js` | Sound effects via Web Audio API | 62 |
| `js/calibration.js` | Dev calibration panel (slider offsets) | 47 |

## Script Load Order (matters!)

Scripts load in `index.html` in this exact order. New files must go in
the correct position:

1. `config.js` — globals and constants (must be first)
2. `registry.js` — box type registration system
3. `box_*.js` — box type implementations (register themselves on load)
4. `calibration.js`, `audio.js`, `particles.js` — utilities
5. `layout.js` — layout computation
6. `belt.js` — belt helpers
7. `physics.js` — marble physics
8. `tunnel.js` — tunnel mechanic
9. `wall.js` — wall mechanic
10. `rendering.js` — all drawing code
11. `editor.js` — level editor
12. `game.js` — game loop, init, boot (must be last)

**Rule: New box type files go AFTER `registry.js` and BEFORE
`calibration.js`.**

**Rule: New mechanic files go AFTER `belt.js` and BEFORE `rendering.js`.**

## Key Patterns

### Global State

All game state lives in global variables declared in `config.js`:
- `stock[]` — the 7×7 grid of box objects
- `physMarbles[]` — active physics marbles in the funnel
- `beltSlots[]` — marbles on the conveyor belt (30 slots)
- `sortCols[]` — the 4 sorting columns at the bottom
- `jumpers[]` — marbles animating from belt to sort
- `particles[]` — visual effects
- `L` — layout measurements (computed by `computeLayout()`)
- `S` — global scale factor (`H / 850`)
- `W, H` — canvas width/height
- `tick` — frame counter

### The Registry Pattern

Box types register via `registerBoxType(id, definition)` in `registry.js`.
Each box type must implement:

```js
registerBoxType('yourtype', {
  label: 'Display Name',        // shown in editor toolbar
  editorColor: '#hexcolor',     // button color in editor
  drawClosed: function(ctx, x, y, w, h, ci, S, tick, idlePhase) { ... },
  drawReveal: function(ctx, x, y, w, h, ci, S, phase, remaining, tick) { ... },
  editorCellStyle: function(ci) { return { background: '...', borderColor: '...' }; },
  editorCellHTML: function(ci) { return '<span>...</span>'; }
});
```

Parameters:
- `ci` — color index (0-7, maps to `COLORS` array)
- `S` — scale factor
- `phase` — 0..1 animation progress for reveal
- `remaining` — marbles left in box
- `tick` — global frame counter

Drawing helpers available: `drawBox()`, `drawMarble()`, `drawBoxMarbles()`,
`drawBoxLip()`, `rRect()` (from `rendering.js`).

### Game Flow

1. Player sees 7×7 grid of boxes (some revealed, some hidden).
2. Tap a revealed box → marbles spawn with physics into the funnel.
3. Marbles fall through funnel onto the conveyor belt.
4. Belt carries marbles around; when a marble passes its matching sort
   column, it jumps in.
5. Fill a sort column → it clears. Clear all → win.

### How a Box Tap Works

`handleTap()` in `game.js` → `spawnPhysMarbles()` in `physics.js`:
1. Checks `isBoxTappable(i)` — revealed, not ice-locked, not already
   spawning.
2. Calls `spawnPhysMarbles(box)` — spawns `MRB_PER_BOX` marbles with
   physics.
3. Calls `damageAdjacentIce(i)` — ice mechanic interaction.
4. Box becomes `used=true` after all marbles spawn.
5. `updateBoxReveals(true)` re-evaluates every box's revealed state — a
   box is open iff there is a path of passable cells (empty slots or
   used-up boxes) from its position to below the bottom edge of the
   grid. Walls, active boxes, and tunnels (including depleted ones) all
   block the path. Boxes whose path just opened become revealed; boxes
   whose path just closed (e.g. from a tunnel spawning a new box into a
   previously-empty cell) close themselves.

### Level Data Format

Levels are created via the level editor and played via "Test Play". Each
cell in a level's `grid` array (49 = 7×7) is:
- `null` — empty slot
- `{ ci: 0-7, type: 'default'|'hidden'|'ice'|'blocker' }` — box
- `{ tunnel: true, dir: 'top'|'bottom'|'left'|'right', contents: [{ci, type}...] }`
  — tunnel
- `{ wall: true }` — wall

## How to Add a New Box Type

1. Create `js/box_<name>.js`.
2. Call `registerBoxType('<name>', { ... })` with all required methods +
   `label` + `editorColor`.
3. Add `<script src="js/box_<name>.js"></script>` to `index.html` AFTER
   the other `box_*.js` files and BEFORE `calibration.js`.
4. If the box needs special game logic (like ice needs
   `damageAdjacentIce`), add that to `game.js`.
5. If the box needs custom state on stock objects, initialize it in
   `initGame()` where stock objects are created.
6. The registry auto-adds new types to the editor toolbar.

Reference implementation for complex box types: `js/box_ice.js`.

## How to Add an Entirely New Mechanic

For mechanics beyond box types (power-up marbles, new belt behaviors,
grid effects):

1. Create a new JS file (e.g., `js/yourmechanic.js`).
2. Add the `<script>` tag in `index.html` AFTER `belt.js` and BEFORE
   `rendering.js`.
3. Hook into the game loop: add update logic in `game.js` `update()`.
4. Hook into rendering: add draw calls in `game.js` `frame()` or extend
   `rendering.js`.
5. Hook into input if needed: extend `handleTap()` in `game.js`.
6. Add any new global state variables to `config.js`.

## Coding Conventions (game-specific)

For the platform-level conventions (no build step, vanilla JS, `var`,
small files), see `PLATFORM.md`. These are specific to this game:

- Canvas drawing uses the global `ctx` and scale factor `S`.
- Colors reference `COLORS[ci]` which has `.fill`, `.light`, `.dark`,
  `.glow`.
- Animations use timer fields on objects (e.g., `popT`, `shakeT`) that
  count down each frame.
