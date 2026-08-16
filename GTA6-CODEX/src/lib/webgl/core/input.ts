/**
 * Input Event Handling Layer
 *
 * Pure functions for pointer and scroll input computation. These functions
 * extract the raw event data transformation logic without state management—
 * the engine retains ownership of `pointerTarget` and `scrollTarget` as
 * instance properties.
 *
 * Consumers in engine.ts wrap these to create event handlers:
 * ```typescript
 * private handlePointerMove = (e: PointerEvent) => {
 *   this.pointerTarget = computePointerTarget(e);
 * };
 *
 * private handleScroll = () => {
 *   this.scrollTarget = computeScrollTarget();
 * };
 * ```
 */

/**
 * Compute normalized device coordinates for pointer position.
 *
 * Converts clientX/clientY (CSS pixels, origin at top-left of viewport)
 * to NDC (normalized device coordinates, range [-1, 1], origin at center).
 *
 * @param e PointerEvent from window 'pointermove'
 * @returns Normalized pointer position { x, y } ∈ [-1, 1]
 */
export function computePointerTarget(e: PointerEvent): { x: number; y: number } {
  return {
    x: (e.clientX / window.innerWidth) * 2 - 1,
    y: (e.clientY / window.innerHeight) * 2 - 1,
  }
}

/**
 * Compute normalized scroll progress.
 *
 * Returns a value in [0, 1] representing the document scroll position
 * relative to the maximum scrollable height. Returns 0 if document
 * is not scrollable (scrollHeight ≤ window.innerHeight).
 *
 * @returns Scroll progress: 0 at top, 1 at bottom, 0 if not scrollable
 */
export function computeScrollTarget(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? window.scrollY / max : 0
}
