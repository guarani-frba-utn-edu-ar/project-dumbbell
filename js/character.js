/**
 * Represents a single game character.
 * Handles animation state and rendering only.
 * Movement and input are managed externally by the Game class.
 * The sprite is flipped horizontally when facing left.
 */
export class Character {
  /**
   * @param {{ idle: HTMLImageElement, walkSheet: HTMLImageElement|null }} images
   * @param {object} config - entry from config/characters.json
   */
  constructor(images, config) {
    this.images = images;
    this.config = config;

    this._isMoving    = false;
    this._facingRight = true;
    this._frameIndex  = 0;
    this._frameTimer  = 0;

    // Use an explicit height from config when provided; otherwise derive it
    // from the idle image's natural proportions so idle and walk frames always
    // occupy the same area.
    this._renderWidth  = config.width;
    this._renderHeight = config.height != null
      ? config.height
      : Math.round(config.width * (images.idle.naturalHeight / images.idle.naturalWidth));
  }

  /**
   * Called each frame by the Game to advance the walk animation.
   * Characters without a walkSheet simply show the idle image while moving.
   * @param {number}  dt          - delta time in seconds
   * @param {boolean} isMoving    - whether the character is currently moving
   * @param {boolean} facingRight - current facing direction
   */
  updateAnimation(dt, isMoving, facingRight) {
    this._isMoving    = isMoving;
    this._facingRight = facingRight;

    const hasAnim = this.images.walkSheet && this.config.animation;

    if (isMoving && hasAnim) {
      this._frameTimer += dt;
      const frameDuration = 1 / this.config.animation.fps;
      if (this._frameTimer >= frameDuration) {
        this._frameTimer -= frameDuration;
        this._frameIndex  = (this._frameIndex + 1) % this.config.animation.frameCount;
      }
    } else {
      this._frameIndex = 0;
      this._frameTimer = 0;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenX   - screen-space X for the character
   * @param {number} roadY     - top Y of the road strip in screen space
   * @param {number} roadHeight
   */
  draw(ctx, screenX, roadY, roadHeight) {
    const w = this._renderWidth;
    const h = this._renderHeight;
    const y = roadY + (roadHeight - h) / 2;
    const destX = this._facingRight ? screenX : 0;

    ctx.save();
    if (!this._facingRight) {
      ctx.translate(screenX + w, 0);
      ctx.scale(-1, 1);
    }

    const useWalk = this._isMoving && this.images.walkSheet && this.config.animation;

    if (useWalk) {
      const sheet  = this.images.walkSheet;
      const frameW = sheet.width / this.config.animation.frameCount;
      ctx.drawImage(
        sheet,
        this._frameIndex * frameW, 0, frameW, sheet.height, // source slice
        destX, y, w, h                                       // destination
      );
    } else {
      ctx.drawImage(this.images.idle, destX, y, w, h);
    }

    ctx.restore();
  }
}
