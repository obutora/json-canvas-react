import { useMemo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "./canvasStore";
import { useStore } from "./store";
import { resolveColor } from "./colors";
import {
  arrowHead,
  chooseSides,
  draftBezier,
  edgeBezier,
  pointsAttr,
  sidePoint,
} from "./geometry";
import type { BezierGeometry } from "./geometry";
import type { CanvasEdge, CanvasNode, Point } from "./types";

interface EdgeGeom {
  edge: CanvasEdge;
  bez: BezierGeometry;
  color: string;
  fromArrow: Point[] | null;
  toArrow: Point[] | null;
}

function computeEdge(edge: CanvasEdge, byId: Map<string, CanvasNode>): EdgeGeom | null {
  const from = byId.get(edge.fromNode);
  const to = byId.get(edge.toNode);
  if (!from || !to) return null;

  const sides =
    edge.fromSide && edge.toSide
      ? { fromSide: edge.fromSide, toSide: edge.toSide }
      : chooseSides(from, to);
  const fromSide = edge.fromSide ?? sides.fromSide;
  const toSide = edge.toSide ?? sides.toSide;

  const source = sidePoint(from, fromSide);
  const target = sidePoint(to, toSide);
  const bez = edgeBezier(source, fromSide, target, toSide);

  const toEnd = edge.toEnd ?? "arrow";
  const fromEnd = edge.fromEnd ?? "none";

  return {
    edge,
    bez,
    color: resolveColor(edge.color, "var(--rjc-edge)"),
    fromArrow: fromEnd === "arrow" ? arrowHead(bez.source, bez.control1) : null,
    toArrow: toEnd === "arrow" ? arrowHead(bez.target, bez.control2) : null,
  };
}

/** SVG layer drawing all committed edges plus the in-progress draft edge. */
export function EdgesLayer() {
  const { store, actions, config } = useCanvas();
  const nodes = useStore(store, (s) => s.nodes);
  const edges = useStore(store, (s) => s.edges);
  const selectedEdgeIds = useStore(store, (s) => s.selectedEdgeIds);
  const draft = useStore(store, (s) => s.draftEdge);

  const byId = useMemo(() => {
    const m = new Map<string, CanvasNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const geoms = useMemo(
    () => edges.map((e) => computeEdge(e, byId)).filter((g): g is EdgeGeom => g !== null),
    [edges, byId],
  );

  const draftGeom = useMemo(() => {
    if (!draft) return null;
    const from = byId.get(draft.fromNode);
    if (!from) return null;
    return draftBezier(sidePoint(from, draft.fromSide), draft.fromSide, draft.to);
  }, [draft, byId]);

  const onEdgeDown = (edge: CanvasEdge) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    actions.selectEdges([edge.id], e.shiftKey);
  };

  return (
    <svg className="rjc-edges" style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "visible", pointerEvents: "none" }}>
      {geoms.map(({ edge, bez, color, fromArrow, toArrow }) => {
        const selected = selectedEdgeIds.includes(edge.id);
        return (
          <g key={edge.id} className={selected ? "rjc-edge rjc-selected" : "rjc-edge"}>
            {!config.readOnly && (
              <path
                d={bez.path}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onPointerDown={onEdgeDown(edge)}
              />
            )}
            <path
              className="rjc-edge-line"
              d={bez.path}
              fill="none"
              stroke={color}
              strokeWidth={selected ? 3.5 : 2}
              strokeLinecap="round"
            />
            {fromArrow && <polygon points={pointsAttr(fromArrow)} fill={color} />}
            {toArrow && <polygon points={pointsAttr(toArrow)} fill={color} />}
          </g>
        );
      })}

      {draftGeom && (
        <path
          className="rjc-edge-draft"
          d={draftGeom.path}
          fill="none"
          stroke="var(--rjc-edge-draft, var(--rjc-edge))"
          strokeWidth={2}
          strokeDasharray="6 5"
        />
      )}
    </svg>
  );
}

/** HTML overlay for edge labels, rendered above nodes. */
export function EdgeLabelsLayer() {
  const { store, actions } = useCanvas();
  const nodes = useStore(store, (s) => s.nodes);
  const edges = useStore(store, (s) => s.edges);
  const selectedEdgeIds = useStore(store, (s) => s.selectedEdgeIds);

  const byId = useMemo(() => {
    const m = new Map<string, CanvasNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const labels = useMemo(
    () =>
      edges
        .filter((e) => e.label)
        .map((e) => {
          const g = computeEdge(e, byId);
          return g ? { edge: e, mid: g.bez.midpoint } : null;
        })
        .filter((x): x is { edge: CanvasEdge; mid: Point } => x !== null),
    [edges, byId],
  );

  if (labels.length === 0) return null;

  return (
    <div className="rjc-edge-labels" style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {labels.map(({ edge, mid }) => (
        <div
          key={edge.id}
          className={selectedEdgeIds.includes(edge.id) ? "rjc-edge-label rjc-selected" : "rjc-edge-label"}
          style={{ position: "absolute", left: mid.x, top: mid.y, transform: "translate(-50%, -50%)", pointerEvents: "auto" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            actions.selectEdges([edge.id], e.shiftKey);
          }}
        >
          {edge.label}
        </div>
      ))}
    </div>
  );
}
