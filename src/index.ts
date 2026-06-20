// Public API for json-canvas-react.

export { JsonCanvas } from "./JsonCanvas";
export type { JsonCanvasProps } from "./JsonCanvas";

// Author canvases in Markdown + frontmatter.
export { MarkdownCanvas } from "./MarkdownCanvas";
export type { MarkdownCanvasProps } from "./MarkdownCanvas";
export { parseMarkdownCanvas } from "./markdownParser";
export type { MarkdownCanvasOptions } from "./markdownParser";

// Spec types.
export type {
  CanvasData,
  CanvasInput,
  CanvasNode,
  CanvasEdge,
  TextNode,
  FileNode,
  LinkNode,
  GroupNode,
  NodeBase,
  CanvasColor,
  CanvasColorPreset,
  NodeSide,
  EdgeEnd,
  BackgroundStyle,
  Point,
  Rect,
  Viewport,
} from "./types";

// Config / advanced types for render overrides.
export type { CanvasConfig, ResolvedFile, DraftEdge, CanvasState } from "./canvasStore";

// Helpers consumers may want.
export { genId, normalizeData, toCanvasData } from "./canvasStore";
export { PRESET_HEX, PRESET_SLOTS, resolveColor, resolveTint, isPreset } from "./colors";
export { MiniMarkdown } from "./markdown";

// Low-level building blocks for custom UIs.
export { useCanvas } from "./canvasStore";
export { useViewport, usePanZoomApi } from "./hooks";
export type { PanZoomApi, FitViewOptions } from "./hooks";

// Geometry utilities (useful for custom edge/minimap rendering).
export {
  edgeBezier,
  chooseSides,
  sidePoint,
  nearestSide,
  nodeAtPoint,
  nodesBounds,
  center,
  rectContainsPoint,
  rectContainsRect,
  rectsIntersect,
} from "./geometry";
export type { BezierGeometry } from "./geometry";
