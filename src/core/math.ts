/** Keeps `value` inside [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear blend: `from` at t = 0, `to` at t = 1. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Eased 0..1 progress of `value` between two edges: slow start, slow finish.
 * Outside the edges it stays at 0 or 1, so callers never need to clamp first.
 */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
