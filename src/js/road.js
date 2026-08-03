/**
 * Renders the dirt road as repeating tiles across the horizontal center of the screen.
 */
export class Road {
  constructor(image, config) {
    this.image = image;
    this.config = config;
  }

  /**
   * Returns the screen Y position and pixel height of the road.
   * @param {number} canvasHeight
   * @returns {{ y: number, height: number }}
   */
  getBounds(canvasHeight) {
    const { height, verticalCenter } = this.config;
    return {
      y: canvasHeight * verticalCenter - height / 2,
      height,
    };
  }

  draw(ctx, cameraX, canvasWidth, canvasHeight) {
    const { tileWidth } = this.config;
    const { y, height } = this.getBounds(canvasHeight);

    const startIndex = Math.floor(cameraX / tileWidth);
    const endIndex = Math.ceil((cameraX + canvasWidth) / tileWidth);

    for (let i = startIndex; i <= endIndex; i++) {
      const screenX = i * tileWidth - cameraX;
      ctx.drawImage(this.image, screenX, y, tileWidth, height);
    }
  }
}
