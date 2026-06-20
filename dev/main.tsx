import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { JsonCanvas, MarkdownCanvas } from "../src";
import type { CanvasData } from "../src";
import "../src/styles.css";

const sampleMarkdown = `---
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
Link to [[intro]] or [[details|see details]] and edges
are drawn automatically.

---

id:: details

## Per-card fields
Use \`id::\`, \`color::\`, \`x::\`, \`y::\`, \`type::\` to set node attributes.

---

id:: ref
type:: link
url:: https://jsoncanvas.org
`;

const sample: CanvasData = {
  nodes: [
    { id: "g1", type: "group", x: -40, y: -40, width: 360, height: 360, label: "Ideas", color: "6" },
    {
      id: "t1",
      type: "text",
      x: 0,
      y: 0,
      width: 260,
      height: 150,
      text: "# JSON Canvas\nAn **open** file format for infinite canvases.\n\n- `text`\n- `file`\n- `link`\n- `group`",
    },
    {
      id: "t2",
      type: "text",
      x: 0,
      y: 180,
      width: 260,
      height: 110,
      color: "4",
      text: "Double-click to edit.\nDrag the **dots** on a node to draw an edge.\nDrag empty space to marquee-select.",
    },
    { id: "l1", type: "link", x: 420, y: 0, width: 300, height: 120, url: "https://jsoncanvas.org" },
    {
      id: "f1",
      type: "file",
      x: 420, y: 170, width: 300, height: 190,
      file: "https://jsoncanvas.org/jsoncanvas.svg",
    },
    { id: "t3", type: "text", x: 820, y: 70, width: 230, height: 110, color: "2", text: "## Connected\nEdges support **arrows**, colors, and labels." },
  ],
  edges: [
    { id: "e1", fromNode: "t1", fromSide: "right", toNode: "l1", toSide: "left", toEnd: "arrow", label: "spec" },
    { id: "e2", fromNode: "t1", toNode: "t2" },
    { id: "e3", fromNode: "l1", toNode: "t3", color: "1", toEnd: "arrow" },
    { id: "e4", fromNode: "f1", toNode: "t3", label: "image" },
  ],
};

function App() {
  const [mode, setMode] = useState<"json" | "markdown">("json");
  const [data, setData] = useState<CanvasData>(sample);
  const [readOnly, setReadOnly] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "8px 14px",
          borderBottom: "1px solid #e2e5ea",
          background: "#fff",
        }}
      >
        <strong>json-canvas-react</strong>
        <span style={{ display: "inline-flex", gap: 4 }}>
          <button
            onClick={() => setMode("json")}
            style={{ fontWeight: mode === "json" ? 700 : 400 }}
          >
            JSON
          </button>
          <button
            onClick={() => setMode("markdown")}
            style={{ fontWeight: mode === "markdown" ? 700 : 400 }}
          >
            Markdown
          </button>
        </span>
        {mode === "json" && (
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            {data.nodes.length} nodes · {data.edges.length} edges
          </span>
        )}
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} /> read-only
        </label>
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          theme: {theme}
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        {mode === "json" ? (
          <JsonCanvas value={data} onChange={setData} readOnly={readOnly} theme={theme} />
        ) : (
          <MarkdownCanvas markdown={sampleMarkdown} readOnly={readOnly} theme={theme} />
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
