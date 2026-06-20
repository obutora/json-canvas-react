import type { CanvasNode, NodeSide, Point, Rect } from "./types";

/** Outward unit normal for each node side. */
const SIDE_NORMAL: Record<NodeSide, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Center point of a rectangle. */
export function center(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** True if point p lies inside rect r (inclusive). */
export function rectContainsPoint(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

/** True if rect `inner` is fully contained within rect `outer`. */
export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** True if two rects overlap at all. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** The attachment point on a given side of a rectangle. */
export function sidePoint(r: Rect, side: NodeSide): Point {
  const c = center(r);
  switch (side) {
    case "top":
      return { x: c.x, y: r.y };
    case "bottom":
      return { x: c.x, y: r.y + r.height };
    case "left":
      return { x: r.x, y: c.y };
    case "right":
      return { x: r.x + r.width, y: c.y };
  }
}

/**
 * Pick the most natural connecting sides between two rects based on the
 * dominant axis between their centers. Used when an edge omits from/toSide.
 */
export function chooseSides(a: Rect, b: Rect): { fromSide: NodeSide; toSide: NodeSide } {
  const ca = center(a);
  const cb = center(b);
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { fromSide: "right", toSide: "left" }
      : { fromSide: "left", toSide: "right" };
  }
  return dy >= 0
    ? { fromSide: "bottom", toSide: "top" }
    : { fromSide: "top", toSide: "bottom" };
}

/** Side of rect `r` nearest to an arbitrary point (used when dropping edges). */
export function nearestSide(r: Rect, p: Point): NodeSide {
  const c = center(r);
  const dLeft = Math.abs(p.x - r.x);
  const dRight = Math.abs(p.x - (r.x + r.width));
  const dTop = Math.abs(p.y - r.y);
  const dBottom = Math.abs(p.y - (r.y + r.height));
  // Bias by which axis the point is more offset on.
  const horiz = Math.min(dLeft, dRight);
  const vert = Math.min(dTop, dBottom);
  if (horiz <= vert) {
    return p.x <= c.x ? "left" : "right";
  }
  return p.y <= c.y ? "top" : "bottom";
}

export interface BezierGeometry {
  /** SVG path "d" string for the connecting curve. */
  path: string;
  source: Point;
  target: Point;
  control1: Point;
  control2: Point;
  /** Point on the curve at t = 0.5 (good label anchor). */
  midpoint: Point;
}

/** Control-point distance for the connector curve. */
function controlOffset(a: Point, b: Point): number {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  return Math.max(24, Math.min(dist * 0.5, 160));
}

/** Evaluate a cubic bezier at parameter t. */
function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/**
 * Build the bezier geometry for an edge between two side points.
 * Control points are pushed outward along each side's normal, producing the
 * familiar "elbow-ish" curve seen in Obsidian Canvas.
 */
export function edgeBezier(
  source: Point,
  sourceSide: NodeSide,
  target: Point,
  targetSide: NodeSide,
): BezierGeometry {
  const n1 = SIDE_NORMAL[sourceSide];
  const n2 = SIDE_NORMAL[targetSide];
  const k = controlOffset(source, target);
  const control1 = { x: source.x + n1.x * k, y: source.y + n1.y * k };
  const control2 = { x: target.x + n2.x * k, y: target.y + n2.y * k };
  const midpoint = cubicAt(source, control1, control2, target, 0.5);
  const path = `M ${source.x} ${source.y} C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${target.x} ${target.y}`;
  return { path, source, target, control1, control2, midpoint };
}

/** A draft (in-progress) edge from a fixed side point to a free cursor point. */
export function draftBezier(source: Point, sourceSide: NodeSide, target: Point): BezierGeometry {
  const n1 = SIDE_NORMAL[sourceSide];
  const k = controlOffset(source, target);
  const control1 = { x: source.x + n1.x * k, y: source.y + n1.y * k };
  const control2 = { x: target.x, y: target.y };
  const midpoint = cubicAt(source, control1, control2, target, 0.5);
  const path = `M ${source.x} ${source.y} C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${target.x} ${target.y}`;
  return { path, source, target, control1, control2, midpoint };
}

/**
 * Triangle points for an arrowhead whose tip sits at `tip`, pointing along the
 * travel direction implied by the nearby control point.
 */
export function arrowHead(tip: Point, control: Point, size = 13): Point[] {
  const dx = tip.x - control.x;
  const dy = tip.y - control.y;
  const len = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / len, y: dy / len };
  const back = { x: tip.x - dir.x * size, y: tip.y - dir.y * size };
  const perp = { x: -dir.y, y: dir.x };
  const half = size * 0.5;
  return [
    tip,
    { x: back.x + perp.x * half, y: back.y + perp.y * half },
    { x: back.x - perp.x * half, y: back.y - perp.y * half },
  ];
}

/** Serialize triangle points to an SVG `points` attribute. */
export function pointsAttr(pts: Point[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(" ");
}

/**
 * Topmost node containing a point. Prefers non-group nodes over groups, and
 * smaller nodes over larger ones (so nested content wins).
 */
export function nodeAtPoint(
  nodes: CanvasNode[],
  p: Point,
  excludeId?: string,
): CanvasNode | null {
  let best: CanvasNode | null = null;
  let bestArea = Infinity;
  let bestIsGroup = true;
  for (const n of nodes) {
    if (n.id === excludeId) continue;
    if (!rectContainsPoint(n, p)) continue;
    const isGroup = n.type === "group";
    const area = n.width * n.height;
    const better =
      best === null ||
      (bestIsGroup && !isGroup) ||
      (bestIsGroup === isGroup && area < bestArea);
    if (better) {
      best = n;
      bestArea = area;
      bestIsGroup = isGroup;
    }
  }
  return best;
}

/** Bounding box of a set of nodes (returns null when empty). */
export function nodesBounds(nodes: CanvasNode[]): Rect | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export { SIDE_NORMAL };
