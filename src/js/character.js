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

    // Idle animation state
    this._playingIdle    = false;
    this._idleFrameIndex = 0;
    this._idleFrameTimer = 0;
    this._idleTimer      = 0;

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

    const hasWalkAnim = this.images.walkSheet && this.config.animation;
    const hasIdleAnim = this.images.idleSheet && this.config.idleAnimationConfig;

    if (isMoving) {
      if (hasWalkAnim) {
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
      // Interrupt any in-progress idle animation immediately
      this._playingIdle    = false;
      this._idleFrameIndex = 0;
      this._idleFrameTimer = 0;
      this._idleTimer      = 0;
    } else {
      // Standing still — reset walk state
      this._frameIndex = 0;
      this._frameTimer = 0;

      if (hasIdleAnim) {
        if (this._playingIdle) {
          // Advance idle animation
          this._idleFrameTimer += dt;
          const frameDuration = 1 / this.config.idleAnimationConfig.fps;
          if (this._idleFrameTimer >= frameDuration) {
            this._idleFrameTimer -= frameDuration;
            this._idleFrameIndex++;
            if (this._idleFrameIndex >= this.config.idleAnimationConfig.frameCount) {
              // Animation complete — return to static idle image and start waiting
              this._playingIdle    = false;
              this._idleFrameIndex = 0;
              this._idleTimer      = 0;
            }
          }
        } else {
          // Waiting for the delay before playing the next idle animation
          this._idleTimer += dt;
          if (this._idleTimer >= this.config.idleAnimationConfig.delay) {
            this._playingIdle    = true;
            this._idleFrameIndex = 0;
            this._idleFrameTimer = 0;
            this._idleTimer      = 0;
          }
        }
      }
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

    const useWalk     = this._isMoving && this.images.walkSheet && this.config.animation;
    const useIdleAnim = this._playingIdle && this.images.idleSheet && this.config.idleAnimationConfig;

    if (useWalk) {
      const sheet  = this.images.walkSheet;
      const frameW = sheet.width / this.config.animation.frameCount;
      ctx.drawImage(
        sheet,
        this._frameIndex * frameW, 0, frameW, sheet.height, // source slice
        destX, y, w, h                                       // destination
      );
    } else if (useIdleAnim) {
      const sheet  = this.images.idleSheet;
      const frameW = sheet.width / this.config.idleAnimationConfig.frameCount;
      ctx.drawImage(
        sheet,
        this._idleFrameIndex * frameW, 0, frameW, sheet.height,
        destX, y, w, h
      );
    } else {
      ctx.drawImage(this.images.idle, destX, y, w, h);
    }

    ctx.restore();
  }
}
