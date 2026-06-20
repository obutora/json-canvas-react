import type {
  CanvasColor,
  CanvasData,
  CanvasEdge,
  CanvasNode,
  EdgeEnd,
  NodeSide,
} from "./types";

/**
 * Authoring a canvas in Markdown + frontmatter.
 *
 * Document shape:
 *
 *   ---
 *   layout: grid          # grid | row | column | none
 *   columns: 2
 *   gap: 56
 *   nodeWidth: 280
 *   nodeHeight: 160
 *   edges: [{ "from": "a", "to": "b", "label": "x" }]   # optional inline JSON
 *   ---
 *
 *   id:: a
 *   color:: 6
 *
 *   # First card
 *   Body is Markdown. Cards are separated by a line of `---`.
 *   Link to [[b]] to draw an edge automatically.
 *
 *   ---
 *
 *   id:: b
 *   x:: 400
 *   y:: 0
 *
 *   ## Second card
 *
 * Notes:
 * - Per-card fields use `key:: value` (Obsidian inline fields) at the top of a card.
 * - Cards without `x::`/`y::` are auto-laid-out.
 * - For an HR *inside* a card use `***` or `___` (a bare `---` splits cards).
 */
export interface MarkdownCanvasOptions {
  /** Auto-layout strategy for cards without explicit x/y. Default "grid". */
  layout?: "grid" | "row" | "column" | "none";
  /** Columns for grid layout. Default 2. */
  columns?: number;
  /** Gap between auto-laid cards (px). Default 48. */
  gap?: number;
  /** Default node width (px). Default 280. */
  nodeWidth?: number;
  /** Default node height (px). Default 180. */
  nodeHeight?: number;
  /** Top-left origin for auto layout. Default 0,0. */
  startX?: number;
  startY?: number;
  /** Create edges from [[wikilinks]] in card bodies. Default true. */
  autoLinkEdges?: boolean;
}

type Dict = Record<string, unknown>;

interface ResolvedOptions extends Required<MarkdownCanvasOptions> {}

function parseValue(raw: string): unknown {
  const s = raw.trim();
  if (s === "") return "";
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^[[{"]/.test(s)) {
    try {
      return JSON.parse(s);
    } catch {
      /* fall through */
    }
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/** Parse a leading `---` frontmatter block of top-level `key: value` scalars. */
function parseFrontmatter(src: string): { data: Dict; body: string } {
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(src);
  if (!m) return { data: {}, body: src };
  const data: Dict = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const kv = /^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*)$/.exec(line);
    if (kv) data[kv[1]] = parseValue(kv[2]);
  }
  return { data, body: src.slice(m[0].length) };
}

const FIELD_RX = /^([A-Za-z_][\w-]*)::[ \t]*(.*)$/;

/** Pull leading `key:: value` inline fields off the top of a card. */
function parseCard(card: string): { attrs: Dict; body: string } {
  const lines = card.split(/\r?\n/);
  const attrs: Dict = {};
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === "") {
      i++;
      continue;
    }
    const m = FIELD_RX.exec(lines[i]);
    if (!m) break;
    attrs[m[1]] = parseValue(m[2]);
    i++;
  }
  return { attrs, body: lines.slice(i).join("\n").trim() };
}

function firstHeading(body: string): string {
  const m = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/m.exec(body);
  return m ? m[1].trim() : "";
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function toNum(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (v != null && /^-?\d+(\.\d+)?$/.test(String(v))) return Number(v);
  return undefined;
}

function asStr(v: unknown): string | undefined {
  return v == null ? undefined : String(v);
}

interface ParsedCard {
  node: CanvasNode;
  body: string;
  explicit: boolean;
}

/** Convert a Markdown + frontmatter document into canvas data. */
export function parseMarkdownCanvas(
  markdown: string,
  options: MarkdownCanvasOptions = {},
): CanvasData {
  const src = (markdown ?? "").replace(/\r\n?/g, "\n");
  const { data: fm, body } = parseFrontmatter(src);

  const opt: ResolvedOptions = {
    layout: (asStr(options.layout ?? fm.layout) as ResolvedOptions["layout"]) || "grid",
    columns: toNum(options.columns ?? fm.columns) ?? 2,
    gap: toNum(options.gap ?? fm.gap) ?? 48,
    nodeWidth: toNum(options.nodeWidth ?? fm.nodeWidth) ?? 280,
    nodeHeight: toNum(options.nodeHeight ?? fm.nodeHeight) ?? 180,
    startX: toNum(options.startX ?? fm.startX) ?? 0,
    startY: toNum(options.startY ?? fm.startY) ?? 0,
    autoLinkEdges:
      (options.autoLinkEdges ?? (fm.autoLinkEdges as boolean | undefined)) !== false,
  };

  const rawCards = body
    .split(/^[ \t]*---[ \t]*$/m)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const used = new Set<string>();
  const slugToId = new Map<string, string>();
  const parsed: ParsedCard[] = [];

  rawCards.forEach((raw, index) => {
    const { attrs, body: cardBody } = parseCard(raw);

    let id = asStr(attrs.id) || slug(firstHeading(cardBody)) || `node-${index + 1}`;
    if (used.has(id)) {
      let n = 2;
      while (used.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    used.add(id);

    const type = (asStr(attrs.type) || "text") as CanvasNode["type"];
    const width = toNum(attrs.width) ?? opt.nodeWidth;
    const height = toNum(attrs.height) ?? opt.nodeHeight;
    const x = toNum(attrs.x);
    const y = toNum(attrs.y);
    const explicit = x != null || y != null;
    const color = asStr(attrs.color) as CanvasColor | undefined;

    const base = { id, x: x ?? 0, y: y ?? 0, width, height, color };
    let node: CanvasNode;
    switch (type) {
      case "link":
        node = { ...base, type: "link", url: asStr(attrs.url) ?? "" };
        break;
      case "file":
        node = {
          ...base,
          type: "file",
          file: asStr(attrs.file) ?? "",
          subpath: asStr(attrs.subpath),
        };
        break;
      case "group":
        node = {
          ...base,
          type: "group",
          label: asStr(attrs.label) ?? (firstHeading(cardBody) || undefined),
        };
        break;
      default:
        node = { ...base, type: "text", text: cardBody };
        break;
    }

    parsed.push({ node, body: cardBody, explicit });
    slugToId.set(slug(id), id);
    const headingSlug = slug(firstHeading(cardBody));
    if (headingSlug && !slugToId.has(headingSlug)) slugToId.set(headingSlug, id);
  });

  // Auto-layout cards that did not specify a position.
  let autoIdx = 0;
  for (const { node, explicit } of parsed) {
    if (explicit) continue;
    const { nodeWidth, nodeHeight, gap, columns, startX, startY, layout } = opt;
    const w = node.width || nodeWidth;
    const h = node.height || nodeHeight;
    if (layout === "row") {
      node.x = startX + autoIdx * (w + gap);
      node.y = startY;
    } else if (layout === "column") {
      node.x = startX;
      node.y = startY + autoIdx * (h + gap);
    } else if (layout === "none") {
      node.x = startX;
      node.y = startY;
    } else {
      const col = autoIdx % columns;
      const row = Math.floor(autoIdx / columns);
      node.x = startX + col * (w + gap);
      node.y = startY + row * (h + gap);
    }
    autoIdx++;
  }

  // Edges.
  const edges: CanvasEdge[] = [];
  const seen = new Set<string>();
  const pushEdge = (e: CanvasEdge) => {
    const key = `${e.fromNode}->${e.toNode}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(e);
  };

  // 1) Explicit edges from frontmatter (inline JSON array).
  if (Array.isArray(fm.edges)) {
    for (const raw of fm.edges as Dict[]) {
      const from = asStr(raw.from ?? raw.fromNode);
      const to = asStr(raw.to ?? raw.toNode);
      if (!from || !to) continue;
      pushEdge({
        id: `edge:${from}:${to}`,
        fromNode: from,
        toNode: to,
        fromSide: asStr(raw.fromSide) as NodeSide | undefined,
        toSide: asStr(raw.toSide) as NodeSide | undefined,
        fromEnd: asStr(raw.fromEnd) as EdgeEnd | undefined,
        toEnd: asStr(raw.toEnd) as EdgeEnd | undefined,
        color: asStr(raw.color) as CanvasColor | undefined,
        label: asStr(raw.label),
      });
    }
  }

  // 2) Auto edges from [[wikilinks]] / [[wikilink|label]] in card bodies.
  if (opt.autoLinkEdges) {
    const wikiRx = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
    for (const { node, body: cardBody } of parsed) {
      let m: RegExpExecArray | null;
      while ((m = wikiRx.exec(cardBody)) !== null) {
        const target = m[1].trim();
        const toId = used.has(target) ? target : slugToId.get(slug(target));
        if (!toId || toId === node.id) continue;
        pushEdge({
          id: `edge:${node.id}:${toId}`,
          fromNode: node.id,
          toNode: toId,
          label: m[2]?.trim(),
        });
      }
    }
  }

  return { nodes: parsed.map((p) => p.node), edges };
}
