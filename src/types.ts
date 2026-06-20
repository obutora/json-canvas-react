/**
 * TypeScript types for the JSON Canvas 1.0 open file format.
 * Spec: https://jsoncanvas.org/spec/1.0/
 */

/** Preset color slot. 1 red, 2 orange, 3 yellow, 4 green, 5 cyan, 6 purple. */
export type CanvasColorPreset = "1" | "2" | "3" | "4" | "5" | "6";

/**
 * A canvas color is either a preset slot ("1".."6") or a hex string ("#FF0000").
 * Stored verbatim from/to the file; resolved to a real CSS color at render time.
 */
export type CanvasColor = CanvasColorPreset | (string & {});

/** Side of a node a edge attaches to. */
export type NodeSide = "top" | "right" | "bottom" | "left";

/** Edge endpoint decoration. */
export type EdgeEnd = "none" | "arrow";

/** How a group background image is rendered. */
export type BackgroundStyle = "cover" | "ratio" | "repeat";

/** All nodes share these fields. */
export interface NodeBase {
  /** Unique identifier within the canvas. */
  id: string;
  /** Node kind discriminator. */
  type: "text" | "file" | "link" | "group";
  /** Top-left X in canvas coordinates (pixels). */
  x: number;
  /** Top-left Y in canvas coordinates (pixels). */
  y: number;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Optional color (preset slot or hex). */
  color?: CanvasColor;
}

/** A text card containing Markdown. */
export interface TextNode extends NodeBase {
  type: "text";
  /** Markdown text content. */
  text: string;
}

/** A node embedding a file from the vault/workspace. */
export interface FileNode extends NodeBase {
  type: "file";
  /** Path to the file. */
  file: string;
  /** Optional subpath (heading/block), begins with "#". */
  subpath?: string;
}

/** A node embedding an external URL. */
export interface LinkNode extends NodeBase {
  type: "link";
  /** The URL. */
  url: string;
}

/** A visual container that can hold other nodes. */
export interface GroupNode extends NodeBase {
  type: "group";
  /** Optional text label shown on the group. */
  label?: string;
  /** Optional path to a background image. */
  background?: string;
  /** How the background image is rendered. */
  backgroundStyle?: BackgroundStyle;
}

/** Union of all node kinds. */
export type CanvasNode = TextNode | FileNode | LinkNode | GroupNode;

/** A directed (optionally) connection between two nodes. */
export interface CanvasEdge {
  /** Unique identifier within the canvas. */
  id: string;
  /** Source node id. */
  fromNode: string;
  /** Side the edge leaves from. */
  fromSide?: NodeSide;
  /** Decoration at the source end (default: "none"). */
  fromEnd?: EdgeEnd;
  /** Target node id. */
  toNode: string;
  /** Side the edge arrives at. */
  toSide?: NodeSide;
  /** Decoration at the target end (default: "arrow"). */
  toEnd?: EdgeEnd;
  /** Optional color (preset slot or hex). */
  color?: CanvasColor;
  /** Optional label drawn at the edge midpoint. */
  label?: string;
}

/**
 * The root JSON Canvas object. Both arrays are optional in the file format;
 * this library normalizes them to arrays internally.
 */
export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/** A canvas as it may appear on disk (arrays optional). */
export interface CanvasInput {
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
}

/** Internal viewport state. */
export interface Viewport {
  /** Screen-space translation X applied to the world layer (pixels). */
  x: number;
  /** Screen-space translation Y applied to the world layer (pixels). */
  y: number;
  /** Zoom factor (1 = 100%). */
  zoom: number;
}

/** A 2D point. */
export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned rectangle. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
