/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round a value to the nearest multiple of `step` (step <= 0 disables). */
export function snap(value: number, step: number): number {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}

export interface DragHandlers {
  onStart?: (e: PointerEvent) => void;
  /** dx/dy are cumulative screen-pixel deltas from the drag origin. */
  onMove: (dx: number, dy: number, e: PointerEvent) => void;
  onEnd?: (e: PointerEvent) => void;
}

/**
 * Begin a pointer drag tracked on `window` so it keeps working when the cursor
 * leaves the element. Returns a cleanup function that ends the drag early.
 */
export function startDrag(
  origin: { clientX: number; clientY: number },
  handlers: DragHandlers,
): () => void {
  const startX = origin.clientX;
  const startY = origin.clientY;
  let moved = false;

  const onMove = (ev: PointerEvent) => {
    moved = true;
    handlers.onMove(ev.clientX - startX, ev.clientY - startY, ev);
  };
  const cleanup = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };
  const onUp = (ev: PointerEvent) => {
    cleanup();
    handlers.onEnd?.(ev);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  handlers.onStart?.(origin as unknown as PointerEvent);
  void moved;
  return cleanup;
}
