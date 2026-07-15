/**
 * Renders the grass background using a horizontal mirroring technique.
 * Every odd tile is flipped horizontally to create a seamless infinite texture.
 */
export class Background {
  constructor(image) {
    this.image = image;
  }

  draw(ctx, cameraX, canvasWidth, canvasHeight) {
    const scale = canvasHeight / this.image.height;
    const tileW = this.image.width * scale;

    const startIndex = Math.floor(cameraX / tileW);
    const endIndex = Math.ceil((cameraX + canvasWidth) / tileW);

    for (let i = startIndex; i <= endIndex; i++) {
      const screenX = i * tileW - cameraX;
      const mirrored = i % 2 !== 0;

      if (mirrored) {
        ctx.save();
        ctx.translate(screenX + tileW, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(this.image, 0, 0, tileW, canvasHeight);
        ctx.restore();
      } else {
        ctx.drawImage(this.image, screenX, 0, tileW, canvasHeight);
      }
    }
  }
}
