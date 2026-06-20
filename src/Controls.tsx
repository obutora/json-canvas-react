import { useCanvas, genId } from "./canvasStore";
import { useStore } from "./store";
import { usePanZoomApi, useViewport } from "./hooks";
import { PRESET_HEX, PRESET_SLOTS } from "./colors";
import type { TextNode } from "./types";

/** Default zoom/fit/add/color toolbar. Render your own by hiding this. */
export function Controls() {
  const { store, actions, config } = useCanvas();
  const panzoom = usePanZoomApi();
  const viewport = useViewport();
  const hasSelection = useStore(
    store,
    (s) => s.selectedNodeIds.length + s.selectedEdgeIds.length > 0,
  );

  const addText = () => {
    const c = panzoom.viewportCenter();
    const node: TextNode = {
      id: genId("text"),
      type: "text",
      x: Math.round(c.x - 125),
      y: Math.round(c.y - 40),
      width: 250,
      height: 80,
      text: "",
    };
    actions.addNode(node, { select: true, edit: true });
  };

  return (
    <div className="rjc-controls" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rjc-controls-row">
        <button
          type="button"
          className="rjc-btn"
          title="Zoom out"
          onClick={() => panzoom.setZoom(viewport.zoom / 1.2)}
        >
          −
        </button>
        <button
          type="button"
          className="rjc-btn rjc-zoom-label"
          title="Reset zoom"
          onClick={() => panzoom.setZoom(1)}
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          type="button"
          className="rjc-btn"
          title="Zoom in"
          onClick={() => panzoom.setZoom(viewport.zoom * 1.2)}
        >
          +
        </button>
        <button
          type="button"
          className="rjc-btn"
          title="Fit to content"
          onClick={() => panzoom.fitView()}
        >
          ⤢
        </button>
        {!config.readOnly && (
          <button type="button" className="rjc-btn rjc-btn-add" title="Add text node" onClick={addText}>
            ＋
          </button>
        )}
      </div>

      {!config.readOnly && hasSelection && (
        <div className="rjc-controls-row rjc-palette">
          {PRESET_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              className="rjc-swatch"
              title={`Color ${slot}`}
              style={{ background: `var(--rjc-color-${slot}, ${PRESET_HEX[slot]})` }}
              onClick={() => actions.setColor(slot)}
            />
          ))}
          <button
            type="button"
            className="rjc-swatch rjc-swatch-none"
            title="No color"
            onClick={() => actions.setColor(undefined)}
          />
        </div>
      )}
    </div>
  );
}
