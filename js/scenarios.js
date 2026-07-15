/**
 * Renders scenario images on the sides of the road.
 *
 * Each item in config/scenarios.json has an absolute worldX position.
 * Scenarios are not repeated — the world ends after the last one.
 *
 * Each item specifies:
 *   - image      : filename inside ./scenarios/
 *   - worldX     : absolute world-space X position
 *   - side       : "top" (above road) | "bottom" (below road)
 *   - width, height : display size in pixels
 *   - gap        : pixel distance between the road edge and the scenario image
 */
export class Scenarios {
  constructor(images, config, roadConfig) {
    this.images = images;       // { "china_town.png": HTMLImageElement, ... }
    this.config = config;
    this.roadConfig = roadConfig;
  }

  /**
   * Returns the world X of the rightmost edge among all scenario items.
   * This is used to clamp player movement.
   * @returns {number}
   */
  getWorldBoundary() {
    return Math.max(...this.config.items.map(item => item.worldX + item.width));
  }

  draw(ctx, cameraX, canvasWidth, canvasHeight) {
    const { items } = this.config;
    const { height: roadHeight, verticalCenter } = this.roadConfig;
    const roadY = canvasHeight * verticalCenter - roadHeight / 2;

    for (const item of items) {
      const screenX = item.worldX - cameraX;

      // Frustum cull
      if (screenX + item.width < 0 || screenX > canvasWidth) continue;

      const img = this.images[item.image];
      if (!img) continue;

      const y = item.side === 'top'
        ? roadY - item.gap - item.height
        : roadY + roadHeight + item.gap;

      ctx.drawImage(img, screenX, y, item.width, item.height);
    }
  }
}
