import { memo } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCanvas, containedNodeIds, genId } from "./canvasStore";
import { usePanZoomApi } from "./hooks";
import { useStore } from "./store";
import { startDrag, snap } from "./dom";
import { resolveColor, resolveTint } from "./colors";
import { nearestSide, nodeAtPoint, sidePoint } from "./geometry";
import { FileNodeBody, GroupNodeBody, LinkNodeBody, TextNodeBody } from "./nodes";
import type { CanvasNode, FileNode, GroupNode, LinkNode, NodeSide, TextNode } from "./types";

const RESIZE_DIRS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
const ANCHOR_SIDES: NodeSide[] = ["top", "right", "bottom", "left"];
const MIN_SIZE = 40;

export const NodeView = memo(function NodeView({ node }: { node: CanvasNode }) {
  const { store, actions, config } = useCanvas();
  const panzoom = usePanZoomApi();
  const selected = useStore(store, (s) => s.selectedNodeIds.includes(node.id));
  const editing = useStore(store, (s) => s.editingNodeId === node.id);

  const isGroup = node.type === "group";
  const readOnly = config.readOnly;

  /* ----------------------------- move/select ---------------------------- */
  const onBodyDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    // Focus the canvas root so keyboard shortcuts (Delete, Cmd+A, …) work.
    (e.currentTarget as HTMLElement).closest<HTMLElement>(".rjc-root")?.focus();

    if (readOnly) {
      actions.selectNodes([node.id], e.shiftKey);
      return;
    }
    if (editing) return;

    const additive = e.shiftKey;
    const wasSelected = store.getState().selectedNodeIds.includes(node.id);
    if (additive) actions.toggleNode(node.id);
    else if (!wasSelected) actions.selectNodes([node.id], false);

    const st = store.getState();
    if (!st.selectedNodeIds.includes(node.id)) return; // toggled off; nothing to drag

    const moving = new Set<string>();
    for (const id of st.selectedNodeIds) {
      moving.add(id);
      const n = st.nodes.find((x) => x.id === id);
      if (n && n.type === "group") {
        containedNodeIds(n, st.nodes, n.id).forEach((c) => moving.add(c));
      }
    }
    const origin: Record<string, { x: number; y: number }> = {};
    for (const id of moving) {
      const n = st.nodes.find((x) => x.id === id);
      if (n) origin[id] = { x: n.x, y: n.y };
    }
    const zoom = st.viewport.zoom;

    startDrag(e, {
      onMove: (dx, dy) => {
        const wx = dx / zoom;
        const wy = dy / zoom;
        const patches: Record<string, { x: number; y: number }> = {};
        for (const id in origin) {
          let nx = origin[id].x + wx;
          let ny = origin[id].y + wy;
          if (config.snapToGrid) {
            nx = snap(nx, config.gridSize);
            ny = snap(ny, config.gridSize);
          }
          patches[id] = { x: nx, y: ny };
        }
        actions.setNodeRects(patches);
      },
      onEnd: () => actions.commit(),
    });
  };

  const onDoubleClick = (e: ReactMouseEvent) => {
    config.onNodeDoubleClick?.(node, e);
    if (!readOnly && node.type === "text") {
      actions.selectNodes([node.id], false);
      actions.setEditing(node.id);
    }
  };

  /* ------------------------------- resize ------------------------------- */
  const onResizeDown = (dir: string) => (e: ReactPointerEvent) => {
    if (e.button !== 0 || readOnly) return;
    e.stopPropagation();
    actions.selectNodes([node.id], false);
    const start = { x: node.x, y: node.y, width: node.width, height: node.height };
    const zoom = store.getState().viewport.zoom;

    startDrag(e, {
      onMove: (dx, dy) => {
        const wx = dx / zoom;
        const wy = dy / zoom;
        let { x, y, width, height } = start;
        if (dir.includes("e")) width = start.width + wx;
        if (dir.includes("s")) height = start.height + wy;
        if (dir.includes("w")) {
          width = start.width - wx;
          x = start.x + wx;
        }
        if (dir.includes("n")) {
          height = start.height - wy;
          y = start.y + wy;
        }
        if (width < MIN_SIZE) {
          if (dir.includes("w")) x = start.x + start.width - MIN_SIZE;
          width = MIN_SIZE;
        }
        if (height < MIN_SIZE) {
          if (dir.includes("n")) y = start.y + start.height - MIN_SIZE;
          height = MIN_SIZE;
        }
        actions.setNodeRects({ [node.id]: { x, y, width, height } });
      },
      onEnd: () => actions.commit(),
    });
  };

  /* --------------------------- edge creation ---------------------------- */
  const onAnchorDown = (side: NodeSide) => (e: ReactPointerEvent) => {
    if (e.button !== 0 || readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    actions.setDraft({ fromNode: node.id, fromSide: side, to: sidePoint(node, side) });

    startDrag(e, {
      onMove: (_dx, _dy, ev) => {
        actions.updateDraftTo(panzoom.screenToWorld(ev.clientX, ev.clientY));
      },
      onEnd: (ev) => {
        const world = panzoom.screenToWorld(ev.clientX, ev.clientY);
        actions.setDraft(null);
        const target = nodeAtPoint(store.getState().nodes, world, node.id);
        if (target) {
          actions.addEdge({
            id: genId("edge"),
            fromNode: node.id,
            fromSide: side,
            toNode: target.id,
            toSide: nearestSide(target, world),
          });
        }
      },
    });
  };

  /* ------------------------------- render ------------------------------- */
  const accent = node.color ? resolveColor(node.color) : undefined;
  const style: CSSProperties = {
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    zIndex: editing ? 30 : selected ? 20 : isGroup ? 1 : 10,
  };
  if (accent) {
    (style as Record<string, string>)["--rjc-accent"] = accent;
    if (!isGroup) style.background = resolveTint(node.color, 10);
  }

  const className = [
    "rjc-node",
    `rjc-node-${node.type}`,
    selected ? "rjc-selected" : "",
    editing ? "rjc-editing" : "",
    readOnly ? "rjc-readonly" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={style}
      data-node-id={node.id}
      onPointerDown={onBodyDown}
      onClick={(e) => config.onNodeClick?.(node, e)}
      onDoubleClick={onDoubleClick}
    >
      <div className="rjc-node-content">
        {node.type === "text" && <TextNodeBody node={node as TextNode} editing={editing} />}
        {node.type === "file" && <FileNodeBody node={node as FileNode} />}
        {node.type === "link" && <LinkNodeBody node={node as LinkNode} />}
        {node.type === "group" && <GroupNodeBody node={node as GroupNode} />}
      </div>

      {!readOnly && (
        <>
          {ANCHOR_SIDES.map((side) => (
            <div
              key={side}
              className={`rjc-anchor rjc-anchor-${side}`}
              onPointerDown={onAnchorDown(side)}
            />
          ))}
          {selected &&
            RESIZE_DIRS.map((dir) => (
              <div
                key={dir}
                className={`rjc-handle rjc-handle-${dir}`}
                onPointerDown={onResizeDown(dir)}
              />
            ))}
        </>
      )}
    </div>
  );
});
