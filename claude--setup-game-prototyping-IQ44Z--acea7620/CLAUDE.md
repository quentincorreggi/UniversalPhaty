# UniversalPhaty — AI Prototyping Platform

UniversalPhaty is a game-agnostic environment for rapidly prototyping new
game mechanics with Claude. One repo holds one game; each prototype lives
on its own branch and auto-deploys to a unique preview URL. This lets
anyone — even non-programmers — describe a mechanic in plain language and
get back a playable link in minutes.

This file is intentionally short. It points you to the two documents that
actually describe how the repo works:

- **`PLATFORM.md`** — the reusable half. Branching conventions, the
  alignment phase, the deploy/URL pipeline, the prototype library, safety
  rules, and how to adopt this repo for a new game. These rules are the
  same for every game built on the platform.
- **`GAME.md`** — the per-game half. Describes the specific game currently
  installed in this repo (its architecture, files, registry pattern, and
  conventions). Replace this file when you fork UniversalPhaty to start
  a different game.

## Session Behavior

When a user starts a session, greet them warmly and explain that this
repo is the UniversalPhaty starter: a clean slate ready for them to
build a new game on top of. Read `GAME.md` — if it still contains the
template `<placeholder>` text, the repo has not yet been configured for
a specific game. In that case, start by asking the user what game they
want to build; the first task is usually to write a "core version" of
the game and fill in `GAME.md`. If `GAME.md` has been filled in, follow
the usual workflow: ask what mechanic they want to prototype. Always use
plain language — the user may not know programming terms.

## Quick Start

Just describe your mechanic idea in plain language. Claude handles the
rest: creates a branch, writes the code, pushes, and returns a playable
URL.

Slash commands:
- `/prototype` — Start a new mechanic prototype from scratch
- `/iterate` — Refine an existing prototype
- `/share` — Publish a prototype to the library landing page

## Where to Look Next

- Reading / editing platform behavior (branches, deploy, alignment):
  `PLATFORM.md`
- Reading / editing game code (files in `js/`, `index.html`): `GAME.md`
- Claude-visible command prompts: `.claude/commands/*.md`
- CI / deploy pipeline: `.github/workflows/deploy-branch.yml`
- Landing page: `landing.html`
