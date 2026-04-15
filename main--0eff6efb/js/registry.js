// Entity type registry — the primary extension point for a UniversalPhaty
// game. Claude adds new mechanics mostly by registering new entity types
// in their own files, so the core game loop stays small and stable.
//
// To add a new entity type:
//   1. Create js/entity_<name>.js
//   2. Call registerEntityType('<name>', { init, update, draw })
//   3. Add a <script> tag to index.html AFTER registry.js and BEFORE
//      game.js
//
// Definition fields (all optional except `draw`):
//   init(e)        — called once when the entity is spawned. Attach any
//                    per-entity state to `e`.
//   update(e, dt)  — called each frame with delta-seconds. Set
//                    `e.dead = true` to remove the entity.
//   draw(ctx, e)   — called each frame. Draw the entity.

var ENTITY_TYPES = {};
var ENTITY_TYPE_ORDER = []; // insertion order, in case a game wants a toolbar

function registerEntityType(id, def) {
  def.id = id;
  ENTITY_TYPES[id] = def;
  ENTITY_TYPE_ORDER.push(id);
}

function getEntityType(id) {
  return ENTITY_TYPES[id] || null;
}

// Create a new entity of the given type, push it into `entities`, and
// return it. Any `params` are merged onto the entity before `init` runs.
function spawnEntity(id, params) {
  var def = getEntityType(id);
  if (!def) {
    console.warn('Unknown entity type:', id);
    return null;
  }
  var e = { type: id };
  if (params) {
    for (var k in params) {
      if (params.hasOwnProperty(k)) e[k] = params[k];
    }
  }
  if (def.init) def.init(e);
  entities.push(e);
  return e;
}
