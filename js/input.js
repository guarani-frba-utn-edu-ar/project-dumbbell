/**
 * Tracks arrow-key state for controlling character movement.
 * A single instance is shared across all characters so they always move in sync.
 */
export class InputHandler {
  constructor() {
    this.left  = false;
    this.right = false;

    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  this.left  = true;
      if (e.key === 'ArrowRight') this.right = true;
    });

    window.addEventListener('keyup', e => {
      if (e.key === 'ArrowLeft')  this.left  = false;
      if (e.key === 'ArrowRight') this.right = false;
    });
  }
}
