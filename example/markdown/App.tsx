// Markdown + frontmatter example — one canvas authored across many files.
//
// Each node lives in its own `.md` file under ./notes (like notes in a vault).
// We load them all, join them into a single document (cards are separated by a
// line of `---`), and let <MarkdownCanvas> turn each card into a node and each
// `[[wikilink]]` into an edge.
import { MarkdownCanvas } from "json-canvas-react";
import "json-canvas-react/styles.css";

// `import.meta.glob` is Vite syntax for importing many files at once. Here every
// note is loaded as a raw string. With another bundler, read the directory and
// concatenate the files yourself instead.
const files = import.meta.glob("./notes/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Sort by filename (01-, 02-, …) so card order is stable, then join with `---`.
const markdown = Object.keys(files)
  .sort()
  .map((path) => files[path])
  .join("\n\n---\n\n");

export default function App() {
  // Layout options are passed here instead of a frontmatter block, since the
  // canvas is assembled from many files. The parent must have a fixed size.
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <MarkdownCanvas
        markdown={markdown}
        options={{ layout: "grid", columns: 3, gap: 64, nodeWidth: 260, nodeHeight: 170 }}
      />
    </div>
  );
}
