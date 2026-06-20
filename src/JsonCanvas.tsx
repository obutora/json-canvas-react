import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  CanvasContext,
  createActions,
  createCanvasStore,
  normalizeData,
} from "./canvasStore";
import type {
  CanvasActions,
  CanvasConfig,
  CanvasContextValue,
  ResolvedFile,
} from "./canvasStore";
import { CanvasSurface } from "./CanvasSurface";
import type {
  CanvasData,
  CanvasInput,
  CanvasNode,
  FileNode,
  LinkNode,
  TextNode,
} from "./types";

export interface JsonCanvasProps {
  /** Controlled canvas data. When provided, sync edits back via `onChange`. */
  value?: CanvasInput;
  /** Initial canvas data for uncontrolled usage. */
  defaultValue?: CanvasInput;
  /** Fired (at gesture boundaries) whenever the canvas changes. */
  onChange?: (data: CanvasData) => void;

  /** Disable all editing interactions (still allows pan/zoom/selection). */
  readOnly?: boolean;

  className?: string;
  style?: CSSProperties;

  /** Background dot grid size in canvas px (default 40). */
  gridSize?: number;
  /** Show the dotted grid background (default true). */
  showGrid?: boolean;
  /** Snap node move/resize to the grid (default false). */
  snapToGrid?: boolean;

  minZoom?: number;
  maxZoom?: number;
  /** Fit content into view on first render (default true). */
  fitOnMount?: boolean;
  /** Show the built-in zoom/fit/add/color toolbar (default true). */
  showControls?: boolean;
  /** Force a color theme; defaults to inheriting `prefers-color-scheme`. */
  theme?: "light" | "dark";

  /** Custom renderer for text node content (default: built-in mini Markdown). */
  renderText?: (node: TextNode) => ReactNode;
  /** Map a file node to renderable content (image/embed/custom). */
  resolveFile?: (node: FileNode) => ResolvedFile;
  /** Custom renderer for link nodes. */
  renderLink?: (node: LinkNode) => ReactNode;

  onNodeClick?: (node: CanvasNode, e: React.MouseEvent) => void;
  onNodeDoubleClick?: (node: CanvasNode, e: React.MouseEvent) => void;
}

/**
 * Render and edit a JSON Canvas (jsoncanvas.org) document.
 *
 * Remember to import the stylesheet once in your app:
 * `import "json-canvas-react/styles.css";`
 */
export function JsonCanvas(props: JsonCanvasProps) {
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;

  // Store + actions are created lazily, once for the component's lifetime.
  const storeRef = useRef<ReturnType<typeof createCanvasStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCanvasStore(
      normalizeData(props.value ?? props.defaultValue),
      { x: 0, y: 0, zoom: 1 },
    );
  }
  const store = storeRef.current;

  const actionsRef = useRef<CanvasActions | null>(null);
  if (!actionsRef.current) {
    actionsRef.current = createActions(store, (data) => onChangeRef.current?.(data));
  }
  const actions = actionsRef.current;

  // Controlled sync: push external value changes into the store.
  const isControlled = props.value !== undefined;
  useEffect(() => {
    if (isControlled) actions.replaceData(normalizeData(props.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  const config = useMemo<CanvasConfig>(
    () => ({
      readOnly: props.readOnly ?? false,
      gridSize: props.gridSize ?? 40,
      snapToGrid: props.snapToGrid ?? false,
      minZoom: props.minZoom ?? 0.1,
      maxZoom: props.maxZoom ?? 4,
      renderText: props.renderText,
      resolveFile: props.resolveFile,
      renderLink: props.renderLink,
      onNodeClick: props.onNodeClick,
      onNodeDoubleClick: props.onNodeDoubleClick,
    }),
    [
      props.readOnly,
      props.gridSize,
      props.snapToGrid,
      props.minZoom,
      props.maxZoom,
      props.renderText,
      props.resolveFile,
      props.renderLink,
      props.onNodeClick,
      props.onNodeDoubleClick,
    ],
  );

  const ctx = useMemo<CanvasContextValue>(
    () => ({ store, actions, config }),
    [store, actions, config],
  );

  return (
    <CanvasContext.Provider value={ctx}>
      <CanvasSurface
        className={props.className}
        style={props.style}
        showControls={props.showControls ?? true}
        showGrid={props.showGrid ?? true}
        fitOnMount={props.fitOnMount ?? true}
        theme={props.theme}
      />
    </CanvasContext.Provider>
  );
}
