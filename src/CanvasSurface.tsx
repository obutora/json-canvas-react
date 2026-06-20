import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCanvas } from "./canvasStore";
import { useStore } from "./store";
import { PanZoomContext, usePanZoom, useViewport } from "./hooks";
import { startDrag } from "./dom";
import { rectsIntersect } from "./geometry";
import { NodeView } from "./NodeView";
import { EdgeLabelsLayer, EdgesLayer } from "./EdgesLayer";
import { Controls } from "./Controls";
import type { Rect } from "./types";

export interface SurfaceProps {
  className?: string;
  style?: CSSProperties;
  showControls: boolean;
  showGrid: boolean;
  fitOnMount: boolean;
  theme?: "light" | "dark";
}

export function CanvasSurface(props: SurfaceProps) {
  const { store, actions, config } = useCanvas();
  const containerRef = useRef<HTMLDivElement>(null);
  const panzoom = usePanZoom(containerRef);
  const viewport = useViewport();
  const nodes = useStore(store, (s) => s.nodes);

  const [marquee, setMarquee] = useState<Rect | null>(null);
  const spaceDown = useRef(false);

  // Fit on mount (after layout so container has a size).
  const didFit = useRef(false);
  useEffect(() => {
    if (props.fitOnMount && !didFit.current && nodes.length > 0) {
      didFit.current = true;
      panzoom.fitView();
    }
  }, [props.fitOnMount, nodes.length, panzoom]);

  // Native wheel listener (non-passive so we can preventDefault).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        panzoom.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
      } else {
        panzoom.panBy(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [panzoom]);

  const beginPan = (e: ReactPointerEvent) => {
    const startVp = store.getState().viewport;
    startDrag(e, {
      onMove: (dx, dy) =>
        actions.setViewport({ x: startVp.x + dx, y: startVp.y + dy, zoom: startVp.zoom }),
    });
  };

  const onBackgroundDown = (e: ReactPointerEvent) => {
    // Middle button or space+left → pan.
    if (e.button === 1 || (e.button === 0 && spaceDown.current)) {
      e.preventDefault();
      beginPan(e);
      return;
    }
    if (e.button !== 0) return;
    containerRef.current?.focus();

    if (config.readOnly) {
      actions.clearSelection();
      beginPan(e);
      return;
    }

    // Left drag on empty space → marquee select.
    actions.setEditing(null);
    actions.clearSelection();
    const start = panzoom.screenToWorld(e.clientX, e.clientY);
    startDrag(e, {
      onMove: (_dx, _dy, ev) => {
        const cur = panzoom.screenToWorld(ev.clientX, ev.clientY);
        const rect: Rect = {
          x: Math.min(start.x, cur.x),
          y: Math.min(start.y, cur.y),
          width: Math.abs(cur.x - start.x),
          height: Math.abs(cur.y - start.y),
        };
        setMarquee(rect);
        const ids = store
          .getState()
          .nodes.filter((n) => rectsIntersect(rect, n))
          .map((n) => n.id);
        actions.selectNodes(ids, false);
      },
      onEnd: () => setMarquee(null),
    });
  };

  // Keyboard shortcuts are handled on the window, gated by whether the most
  // recent pointer interaction landed inside this canvas. This avoids relying
  // on focus (which clicks on non-focusable nodes don't reliably grant) while
  // still not hijacking keys when the user is working elsewhere on the page.
  const active = useRef(false);
  useEffect(() => {
    const onDocDown = (e: PointerEvent) => {
      const el = containerRef.current;
      active.current = !!el && e.target instanceof Node && el.contains(e.target);
    };
    const isTextTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!active.current) return;
      if (e.key === " ") {
        if (!isTextTarget(e.target)) spaceDown.current = true;
        return;
      }
      if (isTextTarget(e.target)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (config.readOnly) return;
        e.preventDefault();
        actions.deleteSelection();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        actions.selectAll();
      } else if (e.key === "Escape") {
        actions.setEditing(null);
        actions.clearSelection();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") spaceDown.current = false;
    };
    document.addEventListener("pointerdown", onDocDown, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("pointerdown", onDocDown, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [actions, config.readOnly]);

  const gridPx = config.gridSize * viewport.zoom;
  const gridStyle: CSSProperties = props.showGrid
    ? {
        backgroundImage: "radial-gradient(var(--rjc-grid-dot) 1px, transparent 1px)",
        backgroundSize: `${gridPx}px ${gridPx}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }
    : {};

  const worldStyle: CSSProperties = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    transformOrigin: "0 0",
  };

  const groups = nodes.filter((n) => n.type === "group");
  const others = nodes.filter((n) => n.type !== "group");

  return (
    <PanZoomContext.Provider value={panzoom}>
      <div
        ref={containerRef}
        className={["rjc-root", props.className].filter(Boolean).join(" ")}
        style={props.style}
        data-rjc-theme={props.theme}
        tabIndex={0}
        onPointerDown={onBackgroundDown}
      >
        <div className="rjc-grid" style={gridStyle} />
        <div className="rjc-world" style={worldStyle}>
          {groups.map((n) => (
            <NodeView key={n.id} node={n} />
          ))}
          <EdgesLayer />
          {others.map((n) => (
            <NodeView key={n.id} node={n} />
          ))}
          <EdgeLabelsLayer />
          {marquee && (
            <div
              className="rjc-marquee"
              style={{
                position: "absolute",
                left: marquee.x,
                top: marquee.y,
                width: marquee.width,
                height: marquee.height,
              }}
            />
          )}
        </div>
        {props.showControls && <Controls />}
      </div>
    </PanZoomContext.Provider>
  );
}
