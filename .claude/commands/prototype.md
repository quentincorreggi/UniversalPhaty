# Prototype a New Mechanic

Guide the user through creating a new mechanic prototype for the game
installed in this UniversalPhaty repo. The game-specific architecture,
registry contract, and mechanic examples used below live in `GAME.md`.
The branch/deploy/alignment workflow lives in `PLATFORM.md`.

## Steps

1. **Understand the mechanic.** Ask the user to describe what they want. If they
   already described it (in $ARGUMENTS), proceed with that description.

2. **Propose a design brief.** Before writing any code, present the user with
   a short plain-language description of what you plan to build. Cover these
   four areas naturally (don't use a rigid numbered checklist — weave them
   into a readable narrative):

   - **How it works** — The core rules and behavior. What happens when the
     player encounters this mechanic? What are the edge cases (including
     interactions with existing mechanics — see `GAME.md` for the full
     list in the current game, e.g. Marble Sorter: ice boxes, blockers,
     tunnels, walls)? Propose sensible defaults for anything the user
     didn't specify.

   - **How the player uses it** — The interaction model. Is it tap-based
     like regular boxes? Does it require timing, multiple taps, dragging, or
     something else? If it changes how existing interactions work (e.g.,
     marbles behave differently on the belt), explain that.

   - **What it looks and sounds like** — Visual appearance on the grid (color,
     shape, icon, animation). What happens visually when the mechanic
     activates (particles, glow, shake, etc.)? Any sound effects? Propose
     specific colors and effects — the user can adjust these later.

   - **How it appears in the authoring surface (level editor)** — What
     toolbar button or mode is added? What color/icon represents it? Can
     the user configure it (e.g., set a timer duration, choose a target
     color)? If the mechanic plugs into the game's registry pattern (see
     `GAME.md` for the current game's registry contract), it may
     auto-appear in the toolbar — mention this so the user knows.

   End by asking: "Does this match what you had in mind? Feel free to change
   anything — or just say 'go for it' and I'll start building."

   **Important:** Propose concrete defaults for every dimension rather than
   asking open-ended questions. The user should be able to approve the whole
   design with a single response.

3. **Create a prototype branch:**
   - Generate a short slug from the mechanic name (lowercase, hyphenated, max 40 chars)
   - Run: `git checkout main && git checkout -b prototype/<slug>`
   - **IMPORTANT:** The branch MUST use the `prototype/` prefix. This is required
     for the prototype to appear on the Prototype Library landing page at the
     GitHub Pages root. Do NOT use `claude/` or any other prefix.

4. **Implement the mechanic** following the patterns in `GAME.md` (game
   architecture, file layout, registry contract) and `PLATFORM.md`
   (coding conventions that hold for every UniversalPhaty game):
   - Extend the game via its registry where possible (in Marble Sorter:
     new box types → `js/box_<name>.js` + register + `<script>` tag).
   - For mechanics outside the registry, follow `GAME.md`'s "How to Add
     an Entirely New Mechanic" section.
   - Follow all conventions: `var` not `const`, global functions, vanilla
     JS, no build step.
   - If the game has a level/scenario system (Marble Sorter has `LEVELS`
     in `config.js`), add at least one showcase level that demonstrates
     the mechanic.

5. **Validate the code:**
   - Run `node --check` on each new or modified JS file to catch syntax errors
   - Verify all `<script>` tags are in the correct order in `index.html`

6. **Commit and push:**
   - `git add` all changed/new files
   - `git commit` with a descriptive message
   - `git push -u origin prototype/<slug>`

7. **Share the result:**
   - Provide the GitHub Pages preview URL (see `PLATFORM.md` for the pattern)
   - Explain what was built, which level to select, and how to test the mechanic
   - Use plain, non-technical language

8. **Offer next steps:** Ask if they want to refine anything or try a different mechanic.
