# Game: Sandloop

Sandloop is a satisfying **falling-sand sorting puzzle**. The screen has
three stacked areas, top to bottom:

1. **Sand image** — a pixel-art picture (default 200×200 cells) made
   entirely of colored sand grains. Grains fall with cellular-automaton
   physics as they become unsupported.
2. **Conveyor belt** — loops under the image, holds up to 5 buckets.
   A bucket on the belt vacuums matching-color grains in a radius directly
   above it, up to its capacity, then disappears.
3. **Bucket grid** — the interactive area at the bottom. A mix of colored
   buckets and empty "path" cells. Tapping an **UP** bucket sends it up
   onto the conveyor. A bucket is UP iff there is a clear path of empty
   cells connecting it to the top row (the row adjacent to the belt).
   Otherwise it's upside-down and non-interactive.

**Goal:** vacuum up every grain of sand in the image.

## Suggestion Seeds for New Mechanics

If the user is unsure what to prototype, offer ideas aligned with the
game:
- **Locked buckets** — padlock icon; needs a key to unlock (key spawns
  from the grid or after N buckets delivered).
- **Mystery `?` buckets** — reveal color only when sent to the belt.
- **Level timer and HP** — race against time; losing grain below a
  threshold costs a heart.
- **Coin economy** — each collected bucket awards coins; shop for power-ups.
- **Multi-color "rainbow" buckets** that accept any sand type.
- **Vacuum beams** drawn from the bucket up to the image.
- **Sand physics variants** — sticky sand, lava that flows sideways,
  frozen sand that needs to be warmed first.
- **Image authoring** — drop a PNG onto the canvas; it samples into the
  sand grid with the nearest palette color.

## Tech Stack

- Vanilla JavaScript, HTML5 Canvas 2D
- No dependencies, no build step — runs directly via `index.html`
- Debug UI is a DOM overlay (not canvas), for easy input controls

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Entry point — loads scripts in the required order |
| `js/config.js` | All global state + `SL.cfgDefault` / `SL.cfg` tunables |
| `js/registry.js` | Entity type registration (`registerEntityType`, `spawnEntity`) |
| `js/palette.js` | Palette lookup + seed-character parser |
| `js/sandfield.js` | The falling-sand pixel grid — physics, draw, suction |
| `js/conveyor.js` | Conveyor belt: bucket movement, suction hook, rendering |
| `js/bucket_grid.js` | Bucket grid: up/down flood-fill, tap handling, rendering |
| `js/entity_bucket.js` | `bucket_flight` hop, `bucket_shake` feedback |
| `js/entity_sandstream.js` | Visual-only grain-in-flight particle |
| `js/debug_panel.js` | DOM overlay for live tuning (D key / gear button) |
| `js/game.js` | Main loop, input, rendering order |

Add a row here whenever you add a new file.

## Script Load Order (matters!)

Scripts load in `index.html` in this exact order:

1. `config.js` — globals (must be first)
2. `registry.js` — entity registry
3. `palette.js` — palette helpers
4. `sandfield.js`, `conveyor.js`, `bucket_grid.js` — core systems
5. `entity_*.js` — entity types (register themselves)
6. `debug_panel.js` — DOM overlay and localStorage loader
7. `game.js` — boot / loop (must be last)

**Rule:** new entity type files go AFTER the core systems and BEFORE
`game.js`. New core systems (a new mechanic not expressible as an entity)
go between `bucket_grid.js` and the entity files — and should expose a
small module pattern like `SL.myThing = (function() { ... })()`.

## Key Patterns

### Global State

All state lives in globals declared in `config.js`:

- `canvas`, `ctx`, `W`, `H` — canvas + drawing context
- `entities[]` — active entities (registry pattern)
- `tick`, `lastT` — frame counter + last timestamp
- `SL` — the Sandloop namespace, holds all game modules and config
- `SL.cfg` — **live** config (what rendering/logic reads)
- `SL.cfgDefault` — factory defaults (for Reset defaults)
- `SL.palette.colors` — array of palette colors by index (0 = empty)
- `SL.state` — `'playing'` | `'won'`
- `SL.totalGrains`, `SL.grainsCollected` — win tracking

### The Registry Pattern

Entity types register via `registerEntityType(id, def)`:

```js
registerEntityType('<id>', {
  init:   function(e) { /* set initial fields */ },
  update: function(e, dt) { /* per-frame; set e.dead = true to remove */ },
  draw:   function(ctx, e) { /* per-frame drawing */ }
});
```

Spawn with `spawnEntity(id, params)`. Params merge onto the entity before
`init` runs.

Current entity types:
- `bucket_flight` — the parabolic hop from grid to belt.
- `bucket_shake` — red/yellow flash on a tapped bucket that can't go.
- `sandstream` — visual grain-in-flight from image into belt bucket.

### System Modules (non-entity)

Big pieces that aren't per-instance (the sand field, the conveyor, the
bucket grid) live in their own file and expose a small interface via
the `SL` namespace. Each has at minimum `reset()`, `step(dt)`, `draw(ctx)`.
Inter-module calls happen via `SL.<module>.<fn>()`.

### Game Flow (per frame)

1. `sandfield.step()` — one pass of sand physics.
2. `conveyor.step(dt)` — slide buckets, query sand suction, spawn sand
   stream VFX, kill full buckets.
3. Entities update (`bucket_flight`, `bucket_shake`, `sandstream`).
4. Dead entities swept.
5. Win check (`sandfield.isEmpty()`).
6. Render: background → sand image → conveyor → bucket grid → entities →
   progress readout.

### The Up/Down Rule (critical)

`bucket_grid.recomputeUp()` runs after **any** change to the grid. It
flood-fills empty cells starting from the top row, then for each bucket
marks it UP iff:

- it's in the top row (always UP), OR
- any of its 4 neighbors is an empty cell that the flood reached.

DOWN buckets render upside-down and desaturated, and `handleTap` rejects
them with a red shake.

## How to Add a New Entity Type

1. Create `js/entity_<name>.js`.
2. Call `registerEntityType('<name>', { init, update, draw })`.
3. Add `<script src="js/entity_<name>.js">` to `index.html` AFTER the
   core systems and BEFORE `game.js`.
4. Spawn with `spawnEntity('<name>', params)` from wherever is relevant.

## How to Add an Entirely New Mechanic

For mechanics that don't fit the registry (a new HUD element, a scoring
system, a sound manager):

1. Create `js/<mechanic>.js` exposing `SL.<mechanic> = (function(){...})()`.
2. Add the `<script>` tag at the right position (see load order).
3. Hook into `game.js` `update()` / `render()` if per-frame work is needed.
4. Add any new globals to `config.js` (and to `SL.cfgDefault` if the
   user might want to tune them from the debug panel).
5. If the mechanic has tunables, add rows to the `SCHEMA` array in
   `debug_panel.js` so they become sliders automatically.

## Debug Panel

Press **D** or click the gear button (top-right) to open the overlay.
Every layout coordinate, size, speed, palette color, and gameplay
tunable is live-editable. Values auto-save to `localStorage` under
`sandloop.cfg.v1`.

- **Reset image** — regenerate sand with the current grid size.
- **Reset grid** — re-seed the bucket grid from `cfg.gridSeed`.
- **Reset belt** — clear the conveyor.
- **Copy values** — dumps a JS snippet of the current config for pasting
  into `config.js` to promote your tweaks to defaults.
- **Save / Load** — explicit round-trip to/from localStorage.
- **Reset defaults** — clear storage and restore `SL.cfgDefault`.

When tweaking `gridCols`/`gridRows` or `gridBucketCols`/`gridBucketRows`,
the relevant system auto-resets so the change is visible immediately.

## Coding Conventions (game-specific)

For the platform-level conventions (no build step, vanilla JS, `var`,
small files), see `PLATFORM.md`. Specific to Sandloop:

- **One top-level global: `SL`.** All modules hang off it. Don't add
  new top-level globals unless they mirror the starter pattern
  (`canvas`, `ctx`, `W`, `H`, `entities`, `tick`, `lastT`).
- **Everything tunable lives in `SL.cfg`.** Rendering and logic read
  from `SL.cfg`, never from `SL.cfgDefault`. That keeps the debug panel
  in control.
- **Colors are palette indices, not hex strings.** Sand cells, buckets,
  and grains all store `1..N` (or 0 for empty). Use `SL.colorAt(idx)`
  to draw.
- **The sand grid is a flat `Uint8Array`** of length `cols * rows`.
  Row-major: `grid[y * cols + x]`. Do not use a 2D JS array for it
  — performance drops sharply above ~100×100.
- **Rendering uses an offscreen canvas for the sand**, not per-cell
  `fillRect`. See `sandfield.draw`.
