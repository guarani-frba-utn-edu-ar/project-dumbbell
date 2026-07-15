# Project Specs — Dumbbell Side-Scroller

## Overview

A browser-based horizontal side-scrolling game built with plain HTML, CSS, and JavaScript (ES modules, no build step). The player moves a group of characters left and right along a road using the arrow keys. Scenarios (decorative images) appear on the sides of the road. The game must be served via an HTTP server (e.g. `npx serve .` or VS Code Live Server) because it uses `fetch` for config files and ES modules.

---

## File Structure

```
index.html
css/
  style.css
config/
  road.json
  characters.json
  secondary-characters.json
  scenarios.json
js/
  config.js
  input.js
  position-trail.js
  background.js
  road.js
  character.js
  secondary-character.js
  scenarios.js
  game.js
background/
  grass-background.png
  dirt-road.png
characters/
  female_fox.png
  female_fox_walk-spriteSheet.png
  mateo.png
  penguin.png
  tonito.png
  brisa.png
  ayolote.png
scenarios/
  parque_avellaneda.png
  china_town.png
  cementerio_recoleta.png
```

---

## Config Files

All configs are JSON, loaded in parallel by `js/config.js` via `fetch`.

### `config/road.json`
```json
{
  "tileWidth": 200,
  "height": 100,
  "verticalCenter": 0.54
}
```
- `tileWidth` — pixel width of each `dirt-road.png` tile
- `height` — pixel height of the road strip
- `verticalCenter` — vertical position of the road center as a fraction of canvas height (0 = top, 1 = bottom)

---

### `config/characters.json`
Array of **main character** entries. All main characters move together as a group; the player controls all of them simultaneously with the arrow keys.

```json
[
  {
    "id": "female_fox",
    "idleImage": "female_fox.png",
    "walkSheet": "female_fox_walk-spriteSheet.png",
    "animation": { "frameCount": 4, "fps": 8 },
    "width": 70,
    "xOffset": 0,
    "speed": 250,
    "screenPositionX": 0.4
  },
  {
    "id": "mateo",
    "idleImage": "mateo.png",
    "walkSheet": null,
    "animation": null,
    "width": 70,
    "xOffset": 60
  }
]
```

- `idleImage` — filename inside `characters/`, shown when standing still
- `walkSheet` — optional sprite sheet filename (single row of frames, all same width); `null` = no walk animation
- `animation.frameCount` — number of frames in the walk sheet
- `animation.fps` — frames per second for the walk animation
- `width` — display width in pixels (height is computed automatically from the idle image's aspect ratio)
- `xOffset` — horizontal offset in pixels from the shared world position (`_worldX`); index-0 character is always at `xOffset: 0`
- `speed` — movement speed in pixels/second (only read from index 0 — the lead character)
- `screenPositionX` — fraction of canvas width where the lead character is fixed on screen (camera follows from here); only read from index 0

---

### `config/secondary-characters.json`
Top-level settings apply to all secondary characters. Each character in the `characters` array spawns once when the lead reaches its `spawnX`, drops from above the road, then follows the group using a position trail.

```json
{
  "mainToSecondaryGap": 100,
  "secondaryToSecondaryGap": 20,
  "dropHeight": 20,
  "dropDuration": 0.2,
  "characters": [
    {
      "id": "penguin",
      "idleImage": "penguin.png",
      "walkSheet": null,
      "animation": null,
      "width": 60,
      "spawnX": 500
    }
  ]
}
```

- `mainToSecondaryGap` — pixel gap between the main group's left edge and the first secondary character's right edge
- `secondaryToSecondaryGap` — pixel gap between consecutive secondary characters
- `dropHeight` — pixels above the road from which each character drops
- `dropDuration` — seconds the drop animation takes (ease-in, like gravity)
- Per character:
  - `idleImage`, `walkSheet`, `animation` — same meaning as main characters
  - `width` — display width in pixels
  - `spawnX` — world X at which this character is triggered; each character spawns only once (no re-trigger on backtrack)

Secondary characters are sorted by `spawnX` at startup; the one with the lowest `spawnX` is always closest to the main group after landing.

---

### `config/scenarios.json`
Decorative images placed beside the road at absolute world X positions. The world ends at the right edge of the furthest scenario — the player cannot move past it.

```json
{
  "items": [
    {
      "image": "parque_avellaneda.png",
      "worldX": 400,
      "side": "top",
      "width": 600,
      "height": 600,
      "gap": 0
    }
  ]
}
```

- `image` — filename inside `scenarios/`
- `worldX` — absolute world X of the image's left edge
- `side` — `"top"` (above the road) or `"bottom"` (below the road)
- `width`, `height` — display size in pixels
- `gap` — additional pixel distance between the road edge and the image

---

## JavaScript Modules

### `js/config.js`
Loads all four config files in parallel with `Promise.all` and returns `{ road, characters, secondaryCharacters, scenarios }`.

### `js/input.js` — `InputHandler`
Tracks `left` and `right` boolean flags via `keydown`/`keyup` on `ArrowLeft`/`ArrowRight`. A single instance is shared so all characters always respond to the same input.

### `js/position-trail.js` — `PositionTrail`
Spatial history of a moving object's world X positions, sampled every `step` pixels (default: 2).
- `update(worldX)` — call each frame; appends samples when moving right, removes them when moving left (rewinds like a tape)
- `getAtDistance(distance)` — returns the worldX that was `distance` pixels behind the current head; clamps to the start if history is too short

Used so secondary characters can stand exactly where the main character was standing `gap` world units ago.

### `js/background.js` — `Background`
Renders `grass-background.png` tiled across the full canvas height. Every odd tile is flipped horizontally to create a seamless mirror pattern.

### `js/road.js` — `Road`
Renders `dirt-road.png` repeated side-by-side across the screen. Exposes `getBounds(canvasHeight)` which returns `{ y, height }` — the screen-space position of the road strip, used by all character renderers.

### `js/character.js` — `Character`
One instance per entry in `characters.json`. Handles walk animation state (`_frameIndex`, `_frameTimer`) and rendering. Does **not** handle input or movement — those are owned by the Game.
- `updateAnimation(dt, isMoving, facingRight)` — advances frame index when moving and a walk sheet exists
- `draw(ctx, screenX, roadY, roadHeight)` — renders idle or walk frame, flipped when facing left. Display height is computed automatically from the idle image's natural aspect ratio × `config.width`.

### `js/secondary-character.js` — `SecondaryCharacter`
Three-state machine: `pending → dropping → active`.
- `trigger(landingX)` — starts the drop animation at the given world X
- `advanceDrop(dt, dropDuration)` — advances the ease-in drop; transitions to `active` when complete
- `updateAnimation(dt, isMoving)` — same walk animation logic as `Character`; `facingRight` is a plain public property set directly by the Game each frame
- `draw(ctx, cameraX, roadY, roadHeight, dropHeight)` — shows idle during drop, idle or walk sheet when active

### `js/scenarios.js` — `Scenarios`
Renders scenario images at their absolute world positions. Items off-screen are culled. `getWorldBoundary()` returns the rightmost edge of all items and is used to clamp player movement.

### `js/game.js` — `Game`
Central orchestrator. Key responsibilities:

**State:**
- `_worldX` — shared world X of the lead character (index-0 in `characters.json`); all main characters' screen positions are derived from `_worldX + char.config.xOffset - cameraX`
- `_facingRight` — shared facing direction
- `_trail` — `PositionTrail` instance tracking the lead's movement history
- `_secondaryChars` — all `SecondaryCharacter` instances, sorted by `spawnX`
- `_activeSecondaries` — subset that have landed, ordered by landing time (index 0 = closest to main group)

**Per-frame update order:**
1. Move `_worldX` from input; clamp to `[0, worldBoundary - lead.width]`
2. Call `char.updateAnimation` for main characters
3. Update the position trail with the clamped `_worldX`
4. Trigger any pending secondary whose `spawnX` has been reached (landing X computed from trail)
5. Advance drop animations; promote newly-landed chars to `_activeSecondaries`
6. Set each active secondary's `worldX` directly from the trail at its cumulative gap distance; call `updateAnimation`

**Draw order (back to front):**
1. Background (full-screen mirrored tiles)
2. Road (horizontal strip)
3. Scenarios
4. Active secondary characters (furthest-back drawn first for z-order)
5. Dropping secondary characters (mid-air, drawn above active line)
6. Main characters (always on top)

---

## Game Mechanics

### Movement & Camera
- The camera keeps the lead character fixed at `screenPositionX` (default: 40%) of the canvas width
- Both left and right arrows are supported; if pressed simultaneously they cancel out
- The world has a hard left boundary at `worldX = 0` and a hard right boundary at the furthest scenario's right edge

### Walk Animation
- Walk sheet must be a single horizontal row of equal-width frames
- Display height is always computed from the idle image's natural aspect ratio applied to `config.width`, so idle and walk frames are guaranteed to occupy the same pixel area
- When no walk sheet is configured (`null`), the idle image is shown during movement too

### Secondary Character Spawning & Following
- A secondary character spawns once when `_worldX >= spawnX`
- It drops from `dropHeight` pixels above the road with an ease-in (quadratic) animation
- After landing it is placed each frame at `trail.getAtDistance(cumulativeGap)`, where `cumulativeGap` is the sum of gaps and widths from the lead character to this secondary's position in the line
- This means each secondary always stands where the character ahead of it was standing, creating a natural snake/chain effect through all direction changes

---

## How to Extend

### Add a new main character
Add an entry to `config/characters.json` with a new `xOffset` (increment by `previousWidth + desiredGap`). Place the image in `characters/`.

### Add a new secondary character
Add an entry to `config/secondary-characters.json` with a unique `spawnX`. Place the image in `characters/`. Set `walkSheet` and `animation` if the character has a walk animation.

### Add a walk animation to an existing character
Set `walkSheet` to the sprite sheet filename and `animation: { "frameCount": N, "fps": F }` in the relevant config entry.

### Add a new scenario
Add an entry to `config/scenarios.json`. Place the image in `scenarios/`. The world boundary automatically extends to include it.