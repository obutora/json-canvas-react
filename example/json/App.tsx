// JSON example — render & edit a JSON Canvas (`.canvas`) file.
//
// `<JsonCanvas>` takes JSON Canvas data (`{ nodes, edges }`) directly. Here we
// load a sibling `.canvas` file as a raw string and parse it, mirroring how
// you'd read a `.canvas` file produced by Obsidian Canvas.
import { useState } from "react";
import { JsonCanvas } from "json-canvas-react";
import type { CanvasData } from "json-canvas-react";
import "json-canvas-react/styles.css";

// `?raw` is Vite syntax for importing a file as a string. With another bundler,
// fetch the file at runtime or import the JSON directly instead.
import raw from "./diagram.canvas?raw";

const initial = JSON.parse(raw) as CanvasData;

export default function App() {
  const [data, setData] = useState<CanvasData>(initial);

  // The parent of <JsonCanvas> must have a fixed size — it fills its container.
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <JsonCanvas value={data} onChange={setData} />
    </div>
  );
}
