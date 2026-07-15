import { loadConfigs }       from './config.js';
import { Background }        from './background.js';
import { Road }              from './road.js';
import { Character }         from './character.js';
import { Scenarios }         from './scenarios.js';
import { InputHandler }      from './input.js';
import { SecondaryCharacter } from './secondary-character.js';
import { PositionTrail }      from './position-trail.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

class Game {
  constructor(canvas, configs, images) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.configs = configs;

    this.background = new Background(images.background);
    this.road       = new Road(images.road, configs.road);
    this.scenarios  = new Scenarios(images.scenarios, configs.scenarios, configs.road);

    // One Character instance per entry in configs.characters
    this.characters = configs.characters.map(
      (charConfig, i) => new Character(images.characters[i], charConfig)
    );

    // Shared movement state — all characters move together
    this._input       = new InputHandler();
    this._worldX      = 0;
    this._facingRight = true;

    // Secondary characters sorted by spawnX so they trigger in ascending order.
    // Each pairs its per-character config with the matching loaded image set.
    const secEntries = configs.secondaryCharacters.characters
      .map((charConfig, i) => ({ config: charConfig, images: images.secondaryCharacters[i] }))
      .sort((a, b) => a.config.spawnX - b.config.spawnX);

    this._secondaryChars    = secEntries.map(e => new SecondaryCharacter(e.images, e.config));
    this._activeSecondaries = []; // ordered: index 0 = closest to main group

    // Spatial trail of main-character positions; secondary chars read from it
    // to always stand exactly where main was at their gap distance ago.
    this._trail = new PositionTrail(2);

    this._lastTime = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /** World X of the left edge of the viewport. Camera follows the lead character (index 0). */
  _getCameraX() {
    const lead = this.configs.characters[0];
    return this._worldX - this.canvas.width * lead.screenPositionX;
  }

  _update(dt) {
    const lead     = this.configs.characters[0];
    const isMoving = this._input.left || this._input.right;

    if (this._input.right) {
      this._worldX      += lead.speed * dt;
      this._facingRight  = true;
    }
    if (this._input.left) {
      this._worldX      -= lead.speed * dt;
      this._facingRight  = false;
    }

    // Clamp left: cannot go before the world origin
    if (this._worldX < 0) this._worldX = 0;

    // Clamp right: cannot move past the rightmost scenario edge
    const maxWorldX = this.scenarios.getWorldBoundary() - lead.width;
    if (this._worldX > maxWorldX) this._worldX = maxWorldX;

    // Update animation for every character
    for (const char of this.characters) {
      char.updateAnimation(dt, isMoving, this._facingRight);
    }

    // --- Secondary characters ---
    const secCfg = this.configs.secondaryCharacters;

    // 1. Advance the position trail with the (now clamped) main worldX.
    this._trail.update(this._worldX);

    // 2. Trigger pending chars whose spawnX the lead has just reached.
    //    Landing position is the trail entry that will match this char's
    //    steady-state slot once it becomes active.
    for (const char of this._secondaryChars) {
      if (char.state === 'pending' && this._worldX >= char.config.spawnX) {
        let d = secCfg.mainToSecondaryGap;
        for (const active of this._activeSecondaries) {
          d += active.config.width + secCfg.secondaryToSecondaryGap;
        }
        d += char.config.width;
        char.trigger(this._trail.getAtDistance(d));
      }
    }

    // 3. Advance drop animations; promote newly landed chars to the active list.
    for (const char of this._secondaryChars) {
      if (char.state === 'dropping') {
        char.advanceDrop(dt, secCfg.dropDuration);
        if (char.state === 'active') {
          this._activeSecondaries.push(char);
        }
      }
    }

    // 4. Place every active secondary at its exact trail position.
    //    cumulativeDistance is the total trail distance from main to that char.
    let cumulativeDistance = 0;
    for (let i = 0; i < this._activeSecondaries.length; i++) {
      const char = this._activeSecondaries[i];
      cumulativeDistance += (i === 0 ? secCfg.mainToSecondaryGap : secCfg.secondaryToSecondaryGap);
      cumulativeDistance += char.config.width;
      char.worldX      = this._trail.getAtDistance(cumulativeDistance);
      char.facingRight = this._facingRight;
      char.updateAnimation(dt, isMoving);
    }
    // Dropping chars face the same direction as main even while mid-air.
    for (const char of this._secondaryChars) {
      if (char.state === 'dropping') char.facingRight = this._facingRight;
    }
  }

  _draw() {
    const { ctx, canvas } = this;
    const W       = canvas.width;
    const H       = canvas.height;
    const cameraX = this._getCameraX();

    ctx.clearRect(0, 0, W, H);

    // 1. Background (full screen, mirrored tiling)
    this.background.draw(ctx, cameraX, W, H);

    // 2. Road (horizontal strip)
    this.road.draw(ctx, cameraX, W, H);

    // 3. Scenarios (above / below the road)
    this.scenarios.draw(ctx, cameraX, W, H);

    const roadBounds = this.road.getBounds(H);
    const { dropHeight } = this.configs.secondaryCharacters;

    // 4. Secondary characters behind the main group.
    //    Active ones drawn back-to-front (furthest back first) for correct z-order.
    for (let i = this._activeSecondaries.length - 1; i >= 0; i--) {
      this._activeSecondaries[i].draw(ctx, cameraX, roadBounds.y, roadBounds.height, dropHeight);
    }
    // Dropping chars are mid-air so draw them above the active line.
    for (const char of this._secondaryChars) {
      if (char.state === 'dropping') {
        char.draw(ctx, cameraX, roadBounds.y, roadBounds.height, dropHeight);
      }
    }

    // 5. Main characters (always in front)
    for (const char of this.characters) {
      const screenX = this._worldX + char.config.xOffset - cameraX;
      char.draw(ctx, screenX, roadBounds.y, roadBounds.height);
    }
  }

  _loop(timestamp) {
    if (this._lastTime === null) this._lastTime = timestamp;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1); // cap at 100 ms
    this._lastTime = timestamp;

    this._update(dt);
    this._draw();

    requestAnimationFrame(ts => this._loop(ts));
  }

  start() {
    requestAnimationFrame(ts => this._loop(ts));
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main() {
  const canvas  = document.getElementById('gameCanvas');
  const configs = await loadConfigs();

  // Load background and road images
  const [bgImg, roadImg] = await Promise.all([
    loadImage('./background/grass-background.png'),
    loadImage('./background/dirt-road.png'),
  ]);

  // Load idle + walk sheet for every character in parallel
  const characterImages = await Promise.all(
    configs.characters.map(charConfig => Promise.all([
      loadImage(`./characters/${charConfig.idleImage}`),
      charConfig.walkSheet
        ? loadImage(`./characters/${charConfig.walkSheet}`)
        : Promise.resolve(null),
    ]).then(([idle, walkSheet]) => ({ idle, walkSheet })))
  );

  // Load images for every secondary character in parallel
  const secondaryCharImages = await Promise.all(
    configs.secondaryCharacters.characters.map(charConfig => Promise.all([
      loadImage(`./characters/${charConfig.idleImage}`),
      charConfig.walkSheet
        ? loadImage(`./characters/${charConfig.walkSheet}`)
        : Promise.resolve(null),
    ]).then(([idle, walkSheet]) => ({ idle, walkSheet })))
  );

  // Load scenario images
  const uniqueNames = [...new Set(configs.scenarios.items.map(i => i.image))];
  const scenarioEntries = await Promise.all(
    uniqueNames.map(name =>
      loadImage(`./scenarios/${name}`).then(img => [name, img])
    )
  );
  const scenarioImages = Object.fromEntries(scenarioEntries);

  const images = {
    background:          bgImg,
    road:                roadImg,
    characters:          characterImages,
    secondaryCharacters: secondaryCharImages,
    scenarios:           scenarioImages,
  };

  const game = new Game(canvas, configs, images);
  game.start();
}

main().catch(err => console.error('Game failed to start:', err));
