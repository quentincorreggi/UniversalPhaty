# Game: <Your Game Name>

> **This is a template.** Replace every `<…>` placeholder with content
> specific to your game. The clearer this document is, the better Claude
> will be at helping you extend the game. The platform-level rules in
> `PLATFORM.md` don't change and don't need to be duplicated here.

This repo currently ships the **UniversalPhaty starter**: a minimal canvas,
an entity registry, a game loop, and a single example entity
(`js/entity_demo.js`). The starter is not a game — it's a clean slate.
Your first job, when working with a user, is to build a playable "core
version" of their game on top of this skeleton.

## What the Game Is

<One or two paragraphs describing the core loop: what the player sees,
what they do, how they win or progress. Keep it plain — the user will
often paste this description in when asking for mechanics.>

## Suggestion Seeds for New Mechanics

If the user is unsure what to prototype, offer ideas aligned with the
game. For example:
- `<Mechanic idea 1>`
- `<Mechanic idea 2>`
- `<Mechanic idea 3>`

## Tech Stack

- Vanilla JavaScript, HTML5 Canvas
- No dependencies, no build step — runs directly via `index.html`

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Entry point — loads all JS, holds the `<canvas>` |
| `js/config.js` | Global state and constants (canvas, entities, tick) |
| `js/registry.js` | Entity type registration (`registerEntityType`, `spawnEntity`) |
| `js/entity_demo.js` | Example entity — delete when you have real ones |
| `js/game.js` | Game loop, init, input |

Add a row here every time you add a new file.

## Script Load Order (matters!)

Scripts load in `index.html` in this exact order. New files must go in
the correct position:

1. `config.js` — globals (must be first)
2. `registry.js` — registry system
3. `entity_*.js` — entity type files (register themselves on load)
4. `game.js` — game loop and boot (must be last)

**Rule: New entity type files go AFTER `registry.js` and BEFORE `game.js`.**

If you add subsystems (physics, input, audio, UI), give them their own
file and insert its `<script>` tag between `registry.js` and `game.js`,
or in a fourth stage depending on its dependencies.

## Key Patterns

### Global State

All game state lives in globals declared in `config.js`:
- `canvas`, `ctx`, `W`, `H` — canvas and drawing context
- `entities[]` — active entities in the world
- `tick` — frame counter
- `lastT` — last frame timestamp (used for `dt`)

Add more globals to `config.js` as your game grows (score, level,
player, input state, etc.).

### The Registry Pattern

Entity types register via `registerEntityType(id, def)`. Each definition
may implement:

```js
registerEntityType('<id>', {
  init:   function(e) { /* set initial fields on a new entity */ },
  update: function(e, dt) { /* per-frame logic; set e.dead = true to remove */ },
  draw:   function(ctx, e) { /* per-frame drawing */ }
});
```

Spawn an entity with `spawnEntity(id, params)` — any fields in `params`
are merged onto the new entity before `init` runs.

### Game Flow

<Describe the per-frame flow of your game: how input is interpreted,
what update() does, what render() does, how win/lose is checked. Keep
this short — 5-10 bullets — and update it as the game evolves.>

## How to Add a New Entity Type

1. Create `js/entity_<name>.js`.
2. Call `registerEntityType('<name>', { init, update, draw })`.
3. Add `<script src="js/entity_<name>.js"></script>` to `index.html`
   AFTER `registry.js` and BEFORE `game.js`.
4. Spawn it from `game.js` (or wherever the game spawns things).

## How to Add an Entirely New Mechanic

For mechanics beyond entity types (input modes, scoring, timers, UI):

1. Create a new JS file (e.g., `js/<mechanic>.js`).
2. Add its `<script>` tag in `index.html` at the right position.
3. Hook into the game loop: add update logic in `game.js` `update()` or
   draw logic in `render()`, or register an entity that drives the
   mechanic.
4. Add any new global state to `config.js`.

## Coding Conventions (game-specific)

For the platform-level conventions (no build step, vanilla JS, `var`,
small files), see `PLATFORM.md`. These are specific to this game:

- `<Convention 1 — e.g., canvas drawing uses a scale factor S>`
- `<Convention 2 — e.g., colors reference a shared PALETTE>`
- `<Convention 3 — e.g., animations use timer fields on objects>`
