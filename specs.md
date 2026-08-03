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
  objects.json
js/
  config.js
  input.js
  position-trail.js
  background.js
  road.js
  character.js
  secondary-character.js
  scenarios.js
  objects.js
  debug-overlay.js
  game.js
background/
  grass-background.png
  dirt-road.png
  objects/
    arbol1.png
    arbol2.png
    arbol3.png
    arbol4.png
    arbusto1.png
    arbusto2.png
    arbusto3.png
characters/
  female_fox.png
  female_fox_idle-spriteSheet.png
  female_fox_walk-spriteSheet.png
  mateo.png
  penguin.png
  penguin_idle-spriteSheet.png
  penguin_walk-spriteSheet.png
  tonito.png
  tonito_idle-spriteSheet.png
  tonito_walk-spriteSheet.png
  brisa.png
  brisa_walk-spriteSheet.png
  ayolote.png
  ayolote_idle-spriteSheet.png
  ayolote_walk-spriteSheet.png
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
  "verticalCenter": 0.54,
  "yLimit": 700
}
```
- `tileWidth` — pixel width of each `dirt-road.png` tile
- `height` — pixel height of the road strip
- `verticalCenter` — vertical position of the road center as a fraction of canvas height (0 = top, 1 = bottom)
- `yLimit` — half-height of the world in Y world units; objects with a `y` value outside `[-yLimit, +yLimit]` are not drawn. Also controls the boundary lines shown by the debug overlay.

---

### `config/characters.json`
Array of **main character** entries. All main characters move together as a group; the player controls all of them simultaneously with the arrow keys.

```json
[
  {
    "id": "female_fox",
    "idleImage": "female_fox.png",
    "idleSheet": "female_fox_idle-spriteSheet.png",
    "idleAnimationConfig": { "frameCount": 4, "fps": 8, "delay": 1.0 },
    "walkSheet": "female_fox_walk-spriteSheet.png",
    "animation": { "frameCount": 4, "fps": 8 },
    "width": 100,
    "height": 100,
    "xOffset": 0,
    "speed": 300,
    "screenPositionX": 0.4
  },
  {
    "id": "mateo",
    "idleImage": "mateo.png",
    "idleSheet": null,
    "walkSheet": "mateo_walk-spriteSheet.png",
    "animation": { "frameCount": 4, "fps": 8 },
    "width": 100,
    "height": 100,
    "xOffset": 70
  }
]
```

- `idleImage` — filename inside `characters/`, shown when standing still (and between idle animation plays)
- `idleSheet` — optional sprite sheet for the idle animation (single row of frames); `null` = no idle animation
- `idleAnimationConfig.frameCount` — number of frames in the idle sheet
- `idleAnimationConfig.fps` — frames per second for the idle animation
- `idleAnimationConfig.delay` — seconds the character stands still before the idle animation plays; after the animation finishes the timer resets and the cycle repeats
- `walkSheet` — optional sprite sheet filename (single row of frames, all same width); `null` = no walk animation
- `animation.frameCount` — number of frames in the walk sheet
- `animation.fps` — frames per second for the walk animation
- `width` — display width in pixels (height is computed automatically from the idle image's aspect ratio unless `height` is set)
- `height` — optional explicit display height in pixels; `null` = derive from idle image aspect ratio
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
      "idleSheet": "penguin_idle-spriteSheet.png",
      "idleAnimationConfig": { "frameCount": 4, "fps": 8, "delay": 3.0 },
      "walkSheet": "penguin_walk-spriteSheet.png",
      "animation": { "frameCount": 4, "fps": 8 },
      "width": 90,
      "height": null,
      "spawnX": 2000
    }
  ]
}
```

- `mainToSecondaryGap` — pixel gap between the main group's left edge and the first secondary character's right edge
- `secondaryToSecondaryGap` — pixel gap between consecutive secondary characters
- `dropHeight` — pixels above the road from which each character drops
- `dropDuration` — seconds the drop animation takes (ease-in, like gravity)
- Per character:
  - `idleImage`, `idleSheet`, `idleAnimationConfig`, `walkSheet`, `animation` — same meaning as main characters
  - `width` — display width in pixels
  - `height` — optional explicit display height; `null` = derive from idle image aspect ratio
  - `spawnX` — world X at which this character is triggered; each character spawns only once (no re-trigger on backtrack)

Secondary characters are sorted by `spawnX` at startup; the one with the lowest `spawnX` is always closest to the main group after landing.

---

### `config/scenarios.json`
Decorative images placed beside the road at absolute world positions. The world ends at the right edge of the furthest scenario — the player cannot move past it.

```json
{
  "items": [
    {
      "image": "parque_avellaneda.png",
      "worldX": 400,
      "y": -650,
      "width": 600,
      "height": 600
    }
  ]
}
```

- `image` — filename inside `scenarios/`
- `worldX` — absolute world X of the image's left edge
- `y` — world Y of the image's **top edge**, relative to the road centre (`Y=0`). Negative = above the road, positive = below. Items outside `[-yLimit, +yLimit]` are not drawn at runtime.
- `width`, `height` — display size in pixels

> **Migration note:** the old `side` / `gap` fields have been replaced by `y`. The equivalent formulas are:
> - `side: "top"`, `gap: G`, `height: H` → `y = -(roadHeight/2 + G + H)`
> - `side: "bottom"`, `gap: G` → `y = roadHeight/2 + G`

---

### `config/objects.json`
Controls the decorative objects (trees, bushes, etc.) that fill the space beside the road. Placements are generated deterministically from a seed at startup.

```json
{
  "seed": 100,
  "minGap": 5,
  "rows": {
    "above": [
      { "gap": 0   },
      { "gap": 200 },
      { "gap": 400 },
      { "gap": 600 }
    ],
    "below": [
      { "gap": 0   },
      { "gap": 150 },
      { "gap": 300 },
      { "gap": 450 }
    ]
  },
  "objects": [
    { "image": "arbol1.png", "width": 160 }
  ]
}
```

- `seed` — integer seed for the PRNG; changing it produces a completely different layout while keeping the same density
- `minGap` — minimum pixel gap between adjacent objects within the same row
- `rows.above` — array of rows placed above the road; each entry defines one horizontal band. Add or remove entries to change the number of rows
- `rows.below` — same for below the road
- `rows.*.gap` — pixel distance from the road edge to the **nearest edge** of objects in that row. For above rows this is the distance from the road top edge to the object bottom edge; for below rows it is the distance from the road bottom edge to the object top edge
- `objects` — pool of objects to pick from randomly. Each entry has:
  - `image` — filename inside `background/objects/`
  - `width` — display width in pixels; height is computed automatically from the image's natural aspect ratio

**Row draw order (above side):** rows are drawn farthest-first so the row with the smallest `gap` (closest to the road) always appears in front.

**Scenario interaction:** at a scenario's X range, a row is only allowed to place objects if its `gap` is large enough to clear the scenario image boundary:
- Above row at an above-side scenario: requires `gap ≥ -scenario.y - roadHeight/2`
- Below row at a below-side scenario: requires `roadHeight/2 + gap ≥ scenario.y + scenario.height`
- Rows that do not meet the threshold skip that X range; rows that do place objects beyond the scenario image.
- The **opposite** side of every scenario (e.g. below the road where a scenario is above) is always unrestricted.

---

## JavaScript Modules

### `js/config.js`
Loads all five config files in parallel with `Promise.all` and returns `{ road, characters, secondaryCharacters, scenarios, objects }`.

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
One instance per entry in `characters.json`. Handles walk and idle animation state and rendering. Does **not** handle input or movement — those are owned by the Game.
- `updateAnimation(dt, isMoving, facingRight)` — advances walk frames when moving; when still, counts down the idle delay and plays the idle sheet once per cycle
- `draw(ctx, screenX, roadY, roadHeight)` — renders walk frame while moving, idle animation frame while the idle cycle is playing, or static idle image otherwise; flipped when facing left

### `js/secondary-character.js` — `SecondaryCharacter`
Three-state machine: `pending → dropping → active`.
- `trigger(landingX)` — starts the drop animation at the given world X
- `advanceDrop(dt, dropDuration)` — advances the ease-in drop; transitions to `active` when complete
- `updateAnimation(dt, isMoving)` — same walk and idle animation logic as `Character`; `facingRight` is a plain public property set directly by the Game each frame
- `draw(ctx, cameraX, roadY, roadHeight, dropHeight)` — shows static idle image during drop; when active, renders walk frame, idle animation frame, or static idle image using the same priority as `Character`

### `js/scenarios.js` — `Scenarios`
Renders scenario images at their absolute world positions. Screen Y is computed as `roadCenterY + item.y`. Items outside `[-yLimit, +yLimit]` (read from `roadConfig.yLimit`) or outside the horizontal viewport are skipped. `getWorldBoundary()` returns the rightmost edge of all items and is used to clamp player movement.

### `js/objects.js` — `WorldObjects`
Generates and renders the decorative objects (trees, bushes, etc.) that fill the space beside the road.

Construction: `new WorldObjects(images, config, roadConfig, scenariosConfig, worldBoundary)`

All placements are computed once in the constructor using a **Mulberry32 seeded PRNG**, so the layout is fully deterministic. Two independent sets of passes are run:

- **Above passes** — one pass per entry in `config.rows.above`. Each row fills its free X intervals left-to-right, packing objects with `minGap` spacing. A scenario's X range is blocked for a given row if the row's `gap` is too small to place the object's bottom edge above the scenario's top edge.
- **Below passes** — same logic for `config.rows.below`, checking the object's top edge against each below-scenario's bottom edge.

The above-side rows are appended to the draw list **farthest-first** (largest `gap` first), so the row closest to the road is drawn on top. Below-side rows are appended in config order.

Objects are frustum-culled horizontally on every draw call.

### `js/debug-overlay.js` — `DebugOverlay`
Toggleable coordinate-system visualiser drawn on top of every frame.
- `toggle()` — flips `enabled`; called by `Game` on **D** key press
- `draw(ctx, cameraX, canvasWidth, canvasHeight, worldBoundary, worldX)` — when enabled, renders:
  - Dashed horizontal grid lines every 250 Y units; solid red lines at `Y = ±yLimit`
  - Dashed vertical grid lines every 500 X units; solid red lines at `X = 0` and `X = worldBoundary`
  - Top-right HUD showing current `worldX` and `cameraX`
  - `[D] toggle debug` hint in the bottom-left corner

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
4. World objects (trees, bushes — drawn in front of scenarios)
5. Active secondary characters (furthest-back drawn first for z-order)
6. Dropping secondary characters (mid-air, drawn above active line)
7. Main characters (always on top)
8. Debug overlay (toggled with **D** key; drawn last so it is always visible)

---

## Coordinate System

The world uses a 2-axis coordinate system centred on the road:

- **X** — horizontal world position in pixels. `0` = left boundary (world start); increases to the right. Maximum is the right edge of the furthest scenario (`worldBoundary`).
- **Y** — vertical world position in pixels, relative to the **road centre**. `0` = road centre; negative = above the road; positive = below the road. Objects outside `[-yLimit, +yLimit]` are not drawn. `yLimit` is set in `config/road.json`.

Screen-space conversion:
- `screenX = worldX - cameraX`
- `screenY = roadCenterY + worldY` (where `roadCenterY = canvasHeight × verticalCenter`)

---

## Game Mechanics

### Movement & Camera
- The camera keeps the lead character fixed at `screenPositionX` (default: 40%) of the canvas width
- Both left and right arrows are supported; if pressed simultaneously they cancel out
- The world has a hard left boundary at `worldX = 0` and a hard right boundary at the furthest scenario's right edge

### Walk Animation
- Walk sheet must be a single horizontal row of equal-width frames
- Display height is always computed from the idle image's natural aspect ratio applied to `config.width`, so idle and walk frames are guaranteed to occupy the same pixel area
- When no walk sheet is configured (`null`), the static idle image is shown during movement too

### Idle Animation
- When a character has been standing still for `idleAnimationConfig.delay` seconds the idle sheet plays through once, then the character returns to the static `idleImage` and the delay timer restarts
- The idle sheet must be a single horizontal row of equal-width frames (same layout as the walk sheet)
- If the player starts moving mid-animation the idle cycle is interrupted immediately and the walk animation takes over
- Characters without an `idleSheet` (or with `idleSheet: null`) always show the static `idleImage` while standing still

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

### Add an idle animation to an existing character
Set `idleSheet` to the sprite sheet filename and `idleAnimationConfig: { "frameCount": N, "fps": F, "delay": D }` in the relevant config entry. Place the sprite sheet in `characters/`. The sheet must be a single horizontal row of `N` equal-width frames. `delay` is the number of seconds the character must stand still before the animation plays.

### Add a new scenario
Add an entry to `config/scenarios.json` with a `y` value (world Y of the image's top edge, relative to road centre). Place the image in `scenarios/`. The world boundary automatically extends to include it.

Quick reference for `y`:
- To place `height`-tall image flush above the road: `y = -(roadHeight/2 + height)`
- To place an image flush below the road: `y = roadHeight/2`
- Add gap pixels to either formula to add spacing between the image and the road edge.

### Add a new world object type
Add an entry to the `objects` array in `config/objects.json` with the `image` filename (inside `background/objects/`) and the desired `width`. The object will be picked randomly alongside the existing pool.

### Add or remove object rows
Add or remove entries in `config.rows.above` or `config.rows.below` in `config/objects.json`. Each entry needs only a `gap` value (pixels from road edge to nearest object edge). Rows with larger `gap` values sit further from the road and will automatically clear taller scenario images.

### Change the object layout
Set a different `seed` integer in `config/objects.json`. The entire layout regenerates deterministically — every seed produces a unique but reproducible arrangement.