import { createContext, useContext, useMemo } from "react";
import type { RefObject } from "react";
import { useStore } from "./store";
import { useCanvas } from "./canvasStore";
import { clamp } from "./dom";
import { nodesBounds } from "./geometry";
import type { Point, Viewport } from "./types";

/** Subscribe to the current viewport. */
export function useViewport(): Viewport {
  const { store } = useCanvas();
  return useStore(store, (s) => s.viewport);
}

export interface FitViewOptions {
  padding?: number;
  /** Max zoom applied while fitting (defaults to 1 so we never magnify). */
  maxZoom?: number;
}

export interface PanZoomApi {
  /** Convert client (page) coordinates to world coordinates. */
  screenToWorld(clientX: number, clientY: number): Point;
  /** Convert world coordinates to container-relative pixel coordinates. */
  worldToScreen(p: Point): Point;
  /** Zoom by `factor`, keeping the given client point stationary. */
  zoomAt(clientX: number, clientY: number, factor: number): void;
  /** Set an absolute zoom level, anchored at the container center. */
  setZoom(zoom: number): void;
  /** Pan by a screen-pixel delta. */
  panBy(dxScreen: number, dyScreen: number): void;
  /** Fit all nodes within the viewport. */
  fitView(options?: FitViewOptions): void;
  /** World coordinates at the center of the container. */
  viewportCenter(): Point;
}

/** Imperative pan/zoom helpers bound to a container element. */
export function usePanZoom(containerRef: RefObject<HTMLElement | null>): PanZoomApi {
  const { store, actions, config } = useCanvas();

  return useMemo<PanZoomApi>(() => {
    const rect = () =>
      containerRef.current?.getBoundingClientRect() ??
      ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);

    const screenToWorld = (clientX: number, clientY: number): Point => {
      const r = rect();
      const vp = store.getState().viewport;
      return {
        x: (clientX - r.left - vp.x) / vp.zoom,
        y: (clientY - r.top - vp.y) / vp.zoom,
      };
    };

    const worldToScreen = (p: Point): Point => {
      const vp = store.getState().viewport;
      return { x: p.x * vp.zoom + vp.x, y: p.y * vp.zoom + vp.y };
    };

    const zoomAt = (clientX: number, clientY: number, factor: number) => {
      const r = rect();
      const vp = store.getState().viewport;
      const newZoom = clamp(vp.zoom * factor, config.minZoom, config.maxZoom);
      if (newZoom === vp.zoom) return;
      const sx = clientX - r.left;
      const sy = clientY - r.top;
      const wx = (sx - vp.x) / vp.zoom;
      const wy = (sy - vp.y) / vp.zoom;
      actions.setViewport({
        x: sx - wx * newZoom,
        y: sy - wy * newZoom,
        zoom: newZoom,
      });
    };

    const setZoom = (zoom: number) => {
      const r = rect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, zoom / store.getState().viewport.zoom);
    };

    const panBy = (dxScreen: number, dyScreen: number) => {
      actions.setViewport((vp) => ({ ...vp, x: vp.x + dxScreen, y: vp.y + dyScreen }));
    };

    const fitView = (options: FitViewOptions = {}) => {
      const r = rect();
      const padding = options.padding ?? 60;
      const maxZoom = options.maxZoom ?? 1;
      const bounds = nodesBounds(store.getState().nodes);
      if (!bounds || r.width === 0 || r.height === 0) {
        actions.setViewport({ x: 0, y: 0, zoom: 1 });
        return;
      }
      const zoom = clamp(
        Math.min(
          (r.width - padding * 2) / bounds.width,
          (r.height - padding * 2) / bounds.height,
        ),
        config.minZoom,
        Math.min(maxZoom, config.maxZoom),
      );
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      actions.setViewport({
        x: r.width / 2 - cx * zoom,
        y: r.height / 2 - cy * zoom,
        zoom,
      });
    };

    const viewportCenter = (): Point => {
      const r = rect();
      return screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
    };

    return { screenToWorld, worldToScreen, zoomAt, setZoom, panBy, fitView, viewportCenter };
  }, [containerRef, store, actions, config.minZoom, config.maxZoom]);
}

/** Context carrying the pan/zoom API to descendant layers. */
export const PanZoomContext = createContext<PanZoomApi | null>(null);

/** Access the pan/zoom API provided by the canvas surface. */
export function usePanZoomApi(): PanZoomApi {
  const api = useContext(PanZoomContext);
  if (!api) throw new Error("usePanZoomApi must be used within <JsonCanvas>");
  return api;
}
