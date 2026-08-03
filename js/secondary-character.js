/**
 * A secondary character that goes through three states:
 *
 *  pending  → The character waits until the lead character reaches its spawnX.
 *  dropping → The character falls from above the road with an ease-in animation.
 *  active   → The character follows the character/group ahead of it in the line.
 *
 * Movement and rendering are driven externally by the Game class.
 * Drop physics settings (dropHeight, dropDuration) are passed in from the
 * top-level secondary-characters.json so they can be tuned in one place.
 */
export class SecondaryCharacter {
  /**
   * @param {{ idle: HTMLImageElement, walkSheet: HTMLImageElement|null }} images
   * @param {object} config - single character entry from config/secondary-characters.json
   */
  constructor(images, config) {
    this.images = images;
    this.config = config;

    this.worldX     = 0;
    this.state       = 'pending';
    this.facingRight = true;  // set each frame by the Game via the trail

    this._dropProgress = 0;
    this._isMoving     = false;
    this._frameIndex   = 0;
    this._frameTimer   = 0;

    // Idle animation state
    this._playingIdle    = false;
    this._idleFrameIndex = 0;
    this._idleFrameTimer = 0;
    this._idleTimer      = 0;

    this._renderWidth  = config.width;
    this._renderHeight = config.height != null
      ? config.height
      : Math.round(config.width * (images.idle.naturalHeight / images.idle.naturalWidth));
  }

  /**
   * Begins the drop animation at the given world X position.
   * @param {number} landingX - world X where the character will stand after landing
   */
  trigger(landingX) {
    this.worldX        = landingX;
    this._dropProgress = 0;
    this.state         = 'dropping';
  }

  /**
   * Advances the drop animation. Transitions to 'active' when the drop completes.
   * @param {number} dt
   * @param {number} dropDuration - seconds for a full drop (from secondary-characters.json)
   */
  advanceDrop(dt, dropDuration) {
    this._dropProgress += dt / dropDuration;
    if (this._dropProgress >= 1) {
      this._dropProgress = 1;
      this.state = 'active';
    }
  }

  /**
   * Advances the walk animation when the character is moving.
   * Characters without a walkSheet simply show the idle image while moving.
   * @param {number}  dt
   * @param {boolean} isMoving
   */
  updateAnimation(dt, isMoving) {
    this._isMoving = isMoving;
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
   * @param {number} cameraX
   * @param {number} roadY
   * @param {number} roadHeight
   * @param {number} dropHeight - pixels above the road where the fall starts (from secondary-characters.json)
   */
  draw(ctx, cameraX, roadY, roadHeight, dropHeight) {
    if (this.state === 'pending') return;

    const w       = this._renderWidth;
    const h       = this._renderHeight;
    const screenX = this.worldX - cameraX;
    const landedY = roadY + (roadHeight - h) / 2;

    let y;
    if (this.state === 'dropping') {
      const easedT = this._dropProgress * this._dropProgress; // ease-in: simulates gravity
      const startY = roadY - dropHeight - h;
      y = startY + (landedY - startY) * easedT;
    } else {
      y = landedY;
    }

    ctx.save();
    if (!this.facingRight) {
      ctx.translate(screenX + w, 0);
      ctx.scale(-1, 1);
    }

    const useWalk     = this.state === 'active' && this._isMoving && this.images.walkSheet && this.config.animation;
    const useIdleAnim = this.state === 'active' && this._playingIdle && this.images.idleSheet && this.config.idleAnimationConfig;
    if (useWalk) {
      const sheet  = this.images.walkSheet;
      const frameW = sheet.width / this.config.animation.frameCount;
      ctx.drawImage(
        sheet,
        this._frameIndex * frameW, 0, frameW, sheet.height,
        this.facingRight ? screenX : 0, y, w, h
      );
    } else if (useIdleAnim) {
      const sheet  = this.images.idleSheet;
      const frameW = sheet.width / this.config.idleAnimationConfig.frameCount;
      ctx.drawImage(
        sheet,
        this._idleFrameIndex * frameW, 0, frameW, sheet.height,
        this.facingRight ? screenX : 0, y, w, h
      );
    } else {
      ctx.drawImage(this.images.idle, this.facingRight ? screenX : 0, y, w, h);
    }

    ctx.restore();
  }
}
