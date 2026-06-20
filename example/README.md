# Examples

Two ways to author a canvas with `json-canvas-react`. Each example pairs a raw
data file (the format) with an `App.tsx` that loads it (a consumer's React code,
importing the library by its package name).

| Folder | Data | Component | Authoring format |
| --- | --- | --- | --- |
| [`json/`](./json) | one `diagram.canvas` | `App.tsx` → `<JsonCanvas>` | JSON Canvas (`{ nodes, edges }`) |
| [`markdown/`](./markdown) | many `notes/*.md` | `App.tsx` → `<MarkdownCanvas>` | Markdown + frontmatter |

- **JSON** — `App.tsx` loads the single `.canvas` file with Vite's `?raw` import
  and parses it.
- **Markdown** — each node is authored as its **own** `.md` file under
  `notes/` (like notes in a vault). `App.tsx` loads them all with Vite's
  `import.meta.glob`, joins them into one document (cards separated by a line of
  `---`), and `[[wikilinks]]` between files become edges. Layout options are
  passed via the `options` prop instead of a frontmatter block.

With another bundler, read the files at runtime and concatenate them yourself
instead of using `?raw` / `import.meta.glob`.

## Running an example

These files are meant to be dropped into your own React + Vite app:

```bash
npm install json-canvas-react react react-dom
```

Then copy a folder's `App.tsx` and its data file into your `src/`, and render
`<App />`.

## Not part of the build

This `example/` directory is for reference only — it is **excluded from the
published package and the build output**:

- `tsup` bundles only `src/index.ts`, so nothing here is emitted to `dist/`.
- `package.json` `files` is `["dist", "README.md"]`, so `example/` is not
  published to npm.
- `tsconfig.json` `include` covers only `src` and `dev`, so these files are not
  type-checked as part of the library (they import `json-canvas-react` as an
  external package, as a real consumer would).
