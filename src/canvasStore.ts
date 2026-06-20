import { createContext, useContext } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { Store } from "./store";
import { createStore } from "./store";
import { rectContainsRect } from "./geometry";
import type {
  CanvasColor,
  CanvasData,
  CanvasEdge,
  CanvasInput,
  CanvasNode,
  FileNode,
  LinkNode,
  NodeSide,
  Point,
  Rect,
  TextNode,
  Viewport,
} from "./types";

/** An in-progress edge being dragged out from a node anchor. */
export interface DraftEdge {
  fromNode: string;
  fromSide: NodeSide;
  /** Current cursor position in world coordinates. */
  to: Point;
}

/** Full interactive state held by the canvas store. */
export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  editingNodeId: string | null;
  draftEdge: DraftEdge | null;
}

/** Result of resolving a file node to something renderable. */
export interface ResolvedFile {
  kind: "image" | "embed" | "unknown";
  /** Image/iframe source URL (for kind "image" | "embed"). */
  src?: string;
  /** Arbitrary custom content (overrides the default rendering). */
  content?: ReactNode;
  /** Display label (defaults to the file name). */
  label?: string;
}

/** Render overrides and behavioral options, shared via context. */
export interface CanvasConfig {
  readOnly: boolean;
  gridSize: number;
  snapToGrid: boolean;
  minZoom: number;
  maxZoom: number;
  /** Custom Markdown/text renderer for text nodes. */
  renderText?: (node: TextNode) => ReactNode;
  /** Map a file node to renderable content. */
  resolveFile?: (node: FileNode) => ResolvedFile;
  /** Custom renderer for link nodes. */
  renderLink?: (node: LinkNode) => ReactNode;
  onNodeClick?: (node: CanvasNode, e: ReactMouseEvent) => void;
  onNodeDoubleClick?: (node: CanvasNode, e: ReactMouseEvent) => void;
}

/** Generate a reasonably unique id at runtime. */
export function genId(prefix = "n"): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return `${prefix}-${c.randomUUID()}`;
  return `${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Normalize loose canvas input into a fully-populated CanvasData. */
export function normalizeData(input?: CanvasInput | null): CanvasData {
  return {
    nodes: input?.nodes ? [...input.nodes] : [],
    edges: input?.edges ? [...input.edges] : [],
  };
}

/** Strip interactive state, returning a clean serializable canvas. */
export function toCanvasData(state: CanvasState): CanvasData {
  return { nodes: state.nodes, edges: state.edges };
}

export function createCanvasStore(
  data: CanvasData,
  viewport: Viewport,
): Store<CanvasState> {
  return createStore<CanvasState>({
    nodes: data.nodes,
    edges: data.edges,
    viewport,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    editingNodeId: null,
    draftEdge: null,
  });
}

type RectPatch = { x?: number; y?: number; width?: number; height?: number };

/**
 * Build the action set bound to a store. `emit` is called whenever the
 * serializable canvas (nodes/edges) changes in a way the host should persist.
 */
export function createActions(
  store: Store<CanvasState>,
  emit: (data: CanvasData) => void,
) {
  const set = store.setState;
  const get = store.getState;
  const fire = () => emit(toCanvasData(get()));

  const actions = {
    replaceData(data: CanvasData) {
      set((s) => {
        if (s.nodes === data.nodes && s.edges === data.edges) return s;
        return { ...s, nodes: data.nodes, edges: data.edges };
      });
    },

    setViewport(updater: Viewport | ((prev: Viewport) => Viewport)) {
      set((s) => ({
        ...s,
        viewport:
          typeof updater === "function"
            ? (updater as (p: Viewport) => Viewport)(s.viewport)
            : updater,
      }));
    },

    selectNodes(ids: string[], additive = false) {
      set((s) => {
        const next = additive
          ? Array.from(new Set([...s.selectedNodeIds, ...ids]))
          : ids;
        return { ...s, selectedNodeIds: next, selectedEdgeIds: additive ? s.selectedEdgeIds : [] };
      });
    },

    toggleNode(id: string) {
      set((s) => {
        const has = s.selectedNodeIds.includes(id);
        return {
          ...s,
          selectedNodeIds: has
            ? s.selectedNodeIds.filter((n) => n !== id)
            : [...s.selectedNodeIds, id],
        };
      });
    },

    selectEdges(ids: string[], additive = false) {
      set((s) => ({
        ...s,
        selectedEdgeIds: additive
          ? Array.from(new Set([...s.selectedEdgeIds, ...ids]))
          : ids,
        selectedNodeIds: additive ? s.selectedNodeIds : [],
      }));
    },

    clearSelection() {
      set((s) =>
        s.selectedNodeIds.length === 0 && s.selectedEdgeIds.length === 0
          ? s
          : { ...s, selectedNodeIds: [], selectedEdgeIds: [] },
      );
    },

    selectAll() {
      set((s) => ({
        ...s,
        selectedNodeIds: s.nodes.map((n) => n.id),
        selectedEdgeIds: s.edges.map((e) => e.id),
      }));
    },

    /** Live geometry update during a drag/resize gesture (no emit). */
    setNodeRects(patches: Record<string, RectPatch>) {
      set((s) => ({
        ...s,
        nodes: s.nodes.map((n) =>
          patches[n.id] ? { ...n, ...patches[n.id] } : n,
        ),
      }));
    },

    /** Persist the current state after a gesture. */
    commit() {
      fire();
    },

    addNode(node: CanvasNode, opts: { select?: boolean; edit?: boolean } = {}) {
      set((s) => ({
        ...s,
        nodes: [...s.nodes, node],
        selectedNodeIds: opts.select ? [node.id] : s.selectedNodeIds,
        selectedEdgeIds: opts.select ? [] : s.selectedEdgeIds,
        editingNodeId: opts.edit ? node.id : s.editingNodeId,
      }));
      fire();
    },

    updateNode(id: string, patch: Partial<CanvasNode>) {
      set((s) => ({
        ...s,
        nodes: s.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as CanvasNode) : n)),
      }));
      fire();
    },

    /** Update without emitting (used for live text typing). */
    updateNodeSilent(id: string, patch: Partial<CanvasNode>) {
      set((s) => ({
        ...s,
        nodes: s.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as CanvasNode) : n)),
      }));
    },

    addEdge(edge: CanvasEdge) {
      set((s) => {
        // Avoid exact duplicates.
        const dup = s.edges.some(
          (e) =>
            e.fromNode === edge.fromNode &&
            e.toNode === edge.toNode &&
            e.fromSide === edge.fromSide &&
            e.toSide === edge.toSide,
        );
        if (dup) return s;
        return { ...s, edges: [...s.edges, edge], selectedEdgeIds: [edge.id], selectedNodeIds: [] };
      });
      fire();
    },

    setColor(color: CanvasColor | undefined) {
      set((s) => {
        const nodeSet = new Set(s.selectedNodeIds);
        const edgeSet = new Set(s.selectedEdgeIds);
        return {
          ...s,
          nodes: s.nodes.map((n) =>
            nodeSet.has(n.id) ? ({ ...n, color } as CanvasNode) : n,
          ),
          edges: s.edges.map((e) => (edgeSet.has(e.id) ? { ...e, color } : e)),
        };
      });
      fire();
    },

    deleteSelection() {
      set((s) => {
        const nodeSet = new Set(s.selectedNodeIds);
        const edgeSet = new Set(s.selectedEdgeIds);
        if (nodeSet.size === 0 && edgeSet.size === 0) return s;
        const nodes = s.nodes.filter((n) => !nodeSet.has(n.id));
        const edges = s.edges.filter(
          (e) => !edgeSet.has(e.id) && !nodeSet.has(e.fromNode) && !nodeSet.has(e.toNode),
        );
        return {
          ...s,
          nodes,
          edges,
          selectedNodeIds: [],
          selectedEdgeIds: [],
          editingNodeId: nodeSet.has(s.editingNodeId ?? "") ? null : s.editingNodeId,
        };
      });
      fire();
    },

    setEditing(id: string | null) {
      set((s) => (s.editingNodeId === id ? s : { ...s, editingNodeId: id }));
    },

    setDraft(draft: DraftEdge | null) {
      set((s) => ({ ...s, draftEdge: draft }));
    },

    updateDraftTo(point: Point) {
      set((s) => (s.draftEdge ? { ...s, draftEdge: { ...s.draftEdge, to: point } } : s));
    },
  };

  return actions;
}

export type CanvasActions = ReturnType<typeof createActions>;

/** Compute the ids of nodes fully contained within a group rect. */
export function containedNodeIds(group: Rect, nodes: CanvasNode[], groupId: string): string[] {
  return nodes
    .filter((n) => n.id !== groupId && rectContainsRect(group, n))
    .map((n) => n.id);
}

/** Value provided through React context to all canvas children. */
export interface CanvasContextValue {
  store: Store<CanvasState>;
  actions: CanvasActions;
  config: CanvasConfig;
}

export const CanvasContext = createContext<CanvasContextValue | null>(null);

export function useCanvas(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used within <JsonCanvas>");
  return ctx;
}
