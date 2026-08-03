/**
 * Records a spatial history of world X positions as a character moves.
 *
 * Positions are sampled at every `step` pixels of movement:
 *   - Moving right → new samples are appended.
 *   - Moving left  → samples beyond the current position are removed.
 *
 * This makes the trail behave like a rewinding tape: backtracking erases the
 * most recent footsteps rather than layering new ones on top.
 *
 * getAtDistance(d) returns the position that was `d` world units behind the
 * current head — i.e. where the character was before it had moved that far.
 */
export class PositionTrail {
  /**
   * @param {number} step - sampling interval in world pixels (smaller = more precise, more memory)
   */
  constructor(step = 2) {
    this._step  = step;
    this._trail = [];    // sampled positions, oldest first
    this._headX = null;  // worldX of the most recent sample
  }

  /**
   * Call once per frame with the character's current worldX.
   * @param {number} worldX
   */
  update(worldX) {
    if (this._headX === null) {
      this._trail.push(worldX);
      this._headX = worldX;
      return;
    }

    if (worldX > this._headX) {
      // Moving right: append new sample(s)
      let x = this._headX + this._step;
      while (x <= worldX) {
        this._trail.push(x);
        x += this._step;
      }
      this._headX = this._trail[this._trail.length - 1];
    } else if (worldX < this._headX) {
      // Moving left: remove sample(s) that are past the current position
      while (this._trail.length > 1 && this._trail[this._trail.length - 1] > worldX) {
        this._trail.pop();
      }
      this._headX = this._trail[this._trail.length - 1];
    }
  }

  /**
   * Returns the worldX that was `distance` pixels behind the current head.
   * Clamps to the oldest recorded position if history is too short.
   * @param {number} distance
   * @returns {number}
   */
  getAtDistance(distance) {
    if (this._trail.length === 0) return 0;
    const stepsBack = Math.round(distance / this._step);
    const idx = Math.max(0, this._trail.length - 1 - stepsBack);
    return this._trail[idx];
  }
}
