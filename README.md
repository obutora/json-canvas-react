# json-canvas-react

English | [日本語](./README.ja.md)

A dependency-light React framework for **rendering and editing** the
[JSON Canvas](https://jsoncanvas.org) open file format (the `.canvas` format used
by Obsidian Canvas).

- 📄 Full JSON Canvas 1.0 support — `text`, `file`, `link`, `group` nodes + edges
- 🖱️ Editor out of the box — pan/zoom, drag, resize, marquee select, draw edges,
  inline Markdown editing, delete, color, keyboard shortcuts
- 🎨 DOM + CSS transform rendering — Markdown & HTML embeds render natively;
  themeable via CSS variables; light/dark themes built in
- 🪶 No runtime dependencies (React is a peer dependency)
- 🧩 Pluggable renderers for text (Markdown), files, and links
- 📝 Author canvases as **Markdown + frontmatter** (`<MarkdownCanvas>`), not just JSON
- 🔒 `readOnly` viewer mode

> Status: **0.1 (early)**. API may change before 1.0.

## Install

```bash
npm install json-canvas-react
```

## Two ways to author a canvas

| Component | Source | Best for |
| --- | --- | --- |
| `<JsonCanvas>` | JSON Canvas data (`{ nodes, edges }`) | full editor, `.canvas` files, programmatic data |
| `<MarkdownCanvas>` | Markdown + frontmatter string | writing canvases by hand as notes |

## Usage (JSON)

```tsx
import { JsonCanvas } from "json-canvas-react";
import type { CanvasData } from "json-canvas-react";
import "json-canvas-react/styles.css";
import { useState } from "react";

const initial: CanvasData = {
  nodes: [
    { id: "a", type: "text", x: 0, y: 0, width: 240, height: 120, text: "# Hello\nFrom **JSON Canvas**" },
    { id: "b", type: "link", x: 320, y: 40, width: 280, height: 110, url: "https://jsoncanvas.org" },
  ],
  edges: [{ id: "e1", fromNode: "a", toNode: "b", toEnd: "arrow", label: "spec" }],
};

export default function App() {
  const [data, setData] = useState(initial);
  // The parent that holds <JsonCanvas> must have a fixed size.
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <JsonCanvas value={data} onChange={setData} />
    </div>
  );
}
```

`<JsonCanvas>` fills its parent, so give the parent an explicit size.

## Usage (Markdown + frontmatter)

Write a canvas as a Markdown document and render it with `<MarkdownCanvas>`. The
document frontmatter holds layout options; the body is split into **cards** by a
line of `---`, and each card becomes a node.

```tsx
import { MarkdownCanvas } from "json-canvas-react";
import "json-canvas-react/styles.css";

const md = `---
layout: grid
columns: 2
gap: 56
nodeWidth: 280
nodeHeight: 160
---

id:: intro
color:: 6

# Markdown Canvas
Author canvases in **Markdown** + frontmatter.
Cards are separated by a line of \`---\`.

---

id:: links
color:: 4

## Wikilinks → edges
Link to [[intro]] or [[details|see details]] and edges are drawn automatically.

---

id:: details
x:: 600
y:: 0

## Per-card fields
Use \`id::\`, \`color::\`, \`x::\`, \`y::\`, \`type::\` to set node attributes.

---

id:: ref
type:: link
url:: https://jsoncanvas.org
`;

export default function App() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <MarkdownCanvas markdown={md} />
    </div>
  );
}
```

### Markdown canvas format

- **Document frontmatter** (leading `---` … `---`): `layout` (`grid` | `row` |
  `column` | `none`), `columns`, `gap`, `nodeWidth`, `nodeHeight`, `startX`,
  `startY`, `autoLinkEdges`, and optional `edges` as **inline JSON**
  (`edges: [{ "from": "a", "to": "b", "label": "x" }]`).
- **Cards** are separated by a line containing only `---`. For a horizontal rule
  *inside* a card, use `***` or `___`.
- **Per-card fields** are Obsidian-style inline fields at the top of a card:
  `id::`, `type::` (`text`|`link`|`file`|`group`), `color::` (`1`–`6` or hex),
  `x::`, `y::`, `width::`, `height::`, `url::` (link), `file::`/`subpath::` (file),
  `label::` (group). Cards without `x::`/`y::` are auto-laid-out.
- **Edges** come from the frontmatter `edges` list and from `[[wikilinks]]`
  (`[[id]]` or `[[id|label]]`) in card bodies. Targets resolve to a card `id::`
  or a heading slug.
- IDs default to the first heading's slug, then `node-1`, `node-2`, …

You can also parse to data yourself:

```tsx
import { parseMarkdownCanvas } from "json-canvas-react";
const data = parseMarkdownCanvas(md); // → { nodes, edges }
```

> `<MarkdownCanvas>` parses Markdown into canvas data and is editable in-memory
> (`onChange` reports `CanvasData`), but edits are **not** serialized back to
> Markdown. The canvas remounts when the `markdown` prop changes.

## Controls

| Action | Gesture |
| --- | --- |
| Pan | Scroll / drag empty space (read-only) / middle-drag / `Space`+drag |
| Zoom | `Ctrl`/`⌘` + scroll, or the toolbar |
| Select | Click a node/edge; `Shift`+click to multi-select |
| Marquee select | Drag on empty space |
| Move | Drag a node (groups move their contents) |
| Resize | Drag a corner/edge handle |
| Connect | Drag from one of the four edge dots onto another node |
| Edit text | Double-click a text node |
| Delete | `Delete` / `Backspace` |
| Select all | `Ctrl`/`⌘` + `A` |

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | `CanvasInput` | — | Controlled data; pair with `onChange` |
| `defaultValue` | `CanvasInput` | — | Uncontrolled initial data |
| `onChange` | `(data: CanvasData) => void` | — | Fires at gesture boundaries |
| `readOnly` | `boolean` | `false` | Viewer mode (pan/zoom/select only) |
| `gridSize` | `number` | `40` | Dot grid spacing (canvas px) |
| `showGrid` | `boolean` | `true` | |
| `snapToGrid` | `boolean` | `false` | Snap move/resize |
| `minZoom` / `maxZoom` | `number` | `0.1` / `4` | |
| `fitOnMount` | `boolean` | `true` | Fit content on first render |
| `showControls` | `boolean` | `true` | Built-in toolbar |
| `theme` | `"light" \| "dark"` | system | |
| `renderText` | `(node) => ReactNode` | mini Markdown | Use react-markdown for full GFM |
| `resolveFile` | `(node) => ResolvedFile` | by extension | Map `file` paths to images/embeds/content |
| `renderLink` | `(node) => ReactNode` | link card | |
| `onNodeClick` / `onNodeDoubleClick` | `(node, e) => void` | — | |

### Custom Markdown (full GFM)

The built-in renderer is intentionally tiny. For full Markdown, plug in your own:

```tsx
import ReactMarkdown from "react-markdown";

<JsonCanvas
  value={data}
  onChange={setData}
  renderText={(node) => <ReactMarkdown>{node.text}</ReactMarkdown>}
/>;
```

### Resolving files

`file` nodes reference vault/workspace-relative paths the library can't read.
Map them to something renderable:

```tsx
<JsonCanvas
  value={data}
  onChange={setData}
  resolveFile={(node) => ({ kind: "image", src: `/vault/${node.file}` })}
/>;
```

## Theming

All colors are CSS variables on `.rjc-root`. Override them in your own CSS:

```css
.rjc-root {
  --rjc-bg: #fafafa;
  --rjc-node-bg: #fff;
  --rjc-selection: #7c3aed;
  --rjc-color-1: #ef4444; /* the six preset slots */
}
```

## Low-level API

For custom UIs (minimaps, custom toolbars) the package also exports `useCanvas`,
`useViewport`, `usePanZoomApi`, and geometry helpers (`edgeBezier`, `sidePoint`,
`nodesBounds`, …). See `src/index.ts`.

## Development

```bash
npm install
npm run dev        # Vite playground at http://localhost:5174
npm run typecheck
npm run build      # tsup → dist/ (+ styles.css)
```

## License

MIT
