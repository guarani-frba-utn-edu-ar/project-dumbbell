/**
 * DebugOverlay — toggleable coordinate-system visualiser.
 *
 * Coordinate system:
 *   X  — world units, 0 = left boundary, positive = right
 *   Y  — world units relative to road centre, negative = above road, positive = below
 *   Limits: X in [0, worldBoundary],  Y in [-1500, +1500]
 *
 * Toggle with the "D" key (wired in game.js).
 */
export class DebugOverlay {
  constructor(roadConfig) {
    this.roadConfig = roadConfig;
    this.enabled    = false;
  }

  toggle() {
    this.enabled = !this.enabled;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cameraX       - world X of the left viewport edge
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @param {number} worldBoundary - rightmost world X (right movement limit)
   * @param {number} worldX        - current lead character world X
   */
  draw(ctx, cameraX, canvasWidth, canvasHeight, worldBoundary, worldX) {
    if (!this.enabled) return;

    const roadCenterY = canvasHeight * this.roadConfig.verticalCenter;

    const Y_LIMIT    = 1500;
    const Y_STEP     = 250;   // horizontal grid lines every 250 Y units
    const X_STEP     = 500;   // vertical grid lines every 500 X units

    ctx.save();
    ctx.font = '11px monospace';

    // ── Horizontal lines (constant Y) ─────────────────────────────────────
    for (let y = -Y_LIMIT; y <= Y_LIMIT; y += Y_STEP) {
      const screenY = roadCenterY + y;
      if (screenY < 0 || screenY > canvasHeight) continue;

      const isBoundary = Math.abs(y) === Y_LIMIT;
      const isOrigin   = y === 0;

      ctx.strokeStyle = isBoundary
        ? 'rgba(255, 70, 70, 0.85)'
        : isOrigin
          ? 'rgba(255, 255, 255, 0.65)'
          : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = isBoundary || isOrigin ? 1.5 : 1;
      ctx.setLineDash(isBoundary ? [] : [4, 6]);

      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvasWidth, screenY);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = isBoundary ? 'rgba(255,100,100,1)' : 'rgba(255,255,255,0.75)';
      ctx.fillText(`Y=${y}`, 6, screenY - 3);
    }

    // ── Vertical lines (constant X) ───────────────────────────────────────
    const firstGridX = Math.ceil(Math.max(0, cameraX) / X_STEP) * X_STEP;
    for (let x = firstGridX; x <= worldBoundary; x += X_STEP) {
      const screenX = x - cameraX;
      if (screenX < 0 || screenX > canvasWidth) continue;

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 6]);

      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvasHeight);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`X=${x}`, screenX + 3, roadCenterY - 4);
    }

    // ── Left boundary (X = 0) ─────────────────────────────────────────────
    const leftScreen = -cameraX;
    if (leftScreen >= 0 && leftScreen <= canvasWidth) {
      ctx.strokeStyle = 'rgba(255, 70, 70, 0.9)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(leftScreen, 0);
      ctx.lineTo(leftScreen, canvasHeight);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,100,100,1)';
      ctx.fillText('X=0', leftScreen + 4, 16);
    }

    // ── Right boundary (X = worldBoundary) ────────────────────────────────
    const rightScreen = worldBoundary - cameraX;
    if (rightScreen >= 0 && rightScreen <= canvasWidth) {
      ctx.strokeStyle = 'rgba(255, 70, 70, 0.9)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(rightScreen, 0);
      ctx.lineTo(rightScreen, canvasHeight);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,100,100,1)';
      const label = `X=${worldBoundary}`;
      const labelW = ctx.measureText(label).width;
      ctx.fillText(label, rightScreen - labelW - 4, 16);
    }

    // ── HUD: current position ─────────────────────────────────────────────
    const hudX  = canvasWidth - 190;
    const hudY  = 8;
    const hudH  = 48;
    const hudW  = 182;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(hudX, hudY, hudW, hudH);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font      = '12px monospace';
    ctx.fillText(`worldX : ${Math.round(worldX)}`, hudX + 8, hudY + 18);
    ctx.fillText(`cameraX: ${Math.round(cameraX)}`, hudX + 8, hudY + 36);

    // ── Hint ──────────────────────────────────────────────────────────────
    ctx.font      = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('[D] toggle debug', 6, canvasHeight - 6);

    ctx.restore();
  }
}
