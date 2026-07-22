/**
 * Renders background objects (trees, bushes, etc.) that fill the space beside the road.
 *
 * Placements are generated once at construction time using a seeded PRNG so the
 * layout is deterministic and reproducible. The seed and per-object sizes are
 * controlled by config/objects.json.
 *
 * Two independent passes fill the above and below sides simultaneously. Each pass
 * only skips X ranges occupied by scenarios on its own side, so the opposite side
 * of every scenario is always available to be filled.
 */

/**
 * Mulberry32 seeded PRNG. Returns a function that yields floats in [0, 1).
 * @param {number} seed  32-bit unsigned integer seed
 * @returns {() => number}
 */
function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

export class WorldObjects {
  /**
   * @param {Object<string, HTMLImageElement>} images          filename → image map
   * @param {object}                           config          parsed objects.json
   * @param {object}                           roadConfig      parsed road.json
   * @param {object}                           scenariosConfig parsed scenarios.json
   * @param {number}                           worldBoundary   right edge of the world in world units
   */
  constructor(images, config, roadConfig, scenariosConfig, worldBoundary) {
    this.images          = images;
    this.config          = config;
    this.roadConfig      = roadConfig;
    this.scenariosConfig = scenariosConfig;

    this._placements = this._generate(worldBoundary);
  }

  /**
   * Converts a list of blocked X intervals into the complementary free intervals
   * spanning [0, worldBoundary].
   * @param {number} worldBoundary
   * @param {{ start: number, end: number }[]} blocked  must be sorted by start
   * @returns {{ start: number, end: number }[]}
   */
  _getFreeIntervals(worldBoundary, blocked) {
    const free = [];
    let cursor = 0;
    for (const b of blocked) {
      if (b.start > cursor) free.push({ start: cursor, end: b.start });
      cursor = Math.max(cursor, b.end);
    }
    if (cursor < worldBoundary) free.push({ start: cursor, end: worldBoundary });
    return free;
  }

  /**
   * Fills one row (a fixed Y position on one side) with objects across all free intervals.
   * Near the end of each interval, only objects whose width fits the remaining space
   * are eligible, so gaps are packed as tightly as possible.
   *
   * @param {() => number}                     rng
   * @param {{ start: number, end: number }[]} freeIntervals
   * @param {number}                           gap   pixel distance from road edge to nearest object edge
   * @param {number}                           roadHalf
   * @param {number}                           yLimit
   * @param {boolean}                          above
   * @param {{ image: string, worldX: number, y: number, width: number, height: number }[]} placements
   */
  _generatePass(rng, freeIntervals, gap, roadHalf, yLimit, above, placements) {
    const { minGap, objects } = this.config;

    for (const interval of freeIntervals) {
      let x = interval.start;

      while (x < interval.end) {
        // Only consider objects that fit in the remaining space of this interval
        const remaining = interval.end - x;
        const fitting   = objects.filter(o => o.width <= remaining);
        if (fitting.length === 0) break;

        const objCfg = fitting[Math.floor(rng() * fitting.length)];
        const img    = this.images[objCfg.image];
        if (!img) { x += minGap; continue; }

        const height = (img.naturalHeight / img.naturalWidth) * objCfg.width;
        // For above rows: gap is the distance from road top edge to object bottom edge.
        // For below rows: gap is the distance from road bottom edge to object top edge.
        const y = above ? -(roadHalf + gap + height) : roadHalf + gap;

        if (y >= -yLimit && y <= yLimit) {
          placements.push({ image: objCfg.image, worldX: x, y, width: objCfg.width, height });
        }

        x += objCfg.width + minGap;
      }
    }
  }

  _generate(worldBoundary) {
    const rng      = createRng(this.config.seed);
    const roadHalf = this.roadConfig.height / 2;
    const yLimit   = this.roadConfig.yLimit;
    const items    = this.scenariosConfig.items;

    const aboveScenarios = items.filter(s => s.y < 0);
    const belowScenarios = items.filter(s => s.y >= 0);

    const placements = [];

    // Above rows: for each row, block the X ranges of above-side scenarios whose
    // top edge is lower than this row's object bottom (gap too small to clear them).
    // Object bottom = -(roadHalf + gap); must be ≤ scenario.y to clear it.
    const aboveRowPlacements = this.config.rows.above.map(row => {
      const blocked = aboveScenarios
        .filter(s => row.gap < (-s.y - roadHalf))
        .map(s => ({ start: s.worldX, end: s.worldX + s.width }))
        .sort((a, b) => a.start - b.start);
      const rowItems = [];
      this._generatePass(rng, this._getFreeIntervals(worldBoundary, blocked), row.gap, roadHalf, yLimit, true, rowItems);
      return rowItems;
    });
    // Append farthest-first so the closest row (gap=0) is drawn on top.
    for (let i = aboveRowPlacements.length - 1; i >= 0; i--) {
      placements.push(...aboveRowPlacements[i]);
    }

    // Below rows: block X ranges of below-side scenarios whose bottom edge is
    // higher than this row's object top (gap too small to clear them).
    // Object top = roadHalf + gap; must be ≥ scenario.y + scenario.height to clear it.
    for (const row of this.config.rows.below) {
      const blocked = belowScenarios
        .filter(s => roadHalf + row.gap < s.y + s.height)
        .map(s => ({ start: s.worldX, end: s.worldX + s.width }))
        .sort((a, b) => a.start - b.start);
      this._generatePass(rng, this._getFreeIntervals(worldBoundary, blocked), row.gap, roadHalf, yLimit, false, placements);
    }

    return placements;
  }

  draw(ctx, cameraX, canvasWidth, canvasHeight) {
    const roadCenterY = canvasHeight * this.roadConfig.verticalCenter;

    for (const item of this._placements) {
      const screenX = item.worldX - cameraX;

      // Frustum cull (horizontal)
      if (screenX + item.width < 0 || screenX > canvasWidth) continue;

      const img = this.images[item.image];
      if (!img) continue;

      ctx.drawImage(img, screenX, roadCenterY + item.y, item.width, item.height);
    }
  }
}
