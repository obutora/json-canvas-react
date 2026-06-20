import { useMemo } from "react";
import { JsonCanvas } from "./JsonCanvas";
import type { JsonCanvasProps } from "./JsonCanvas";
import { parseMarkdownCanvas } from "./markdownParser";
import type { MarkdownCanvasOptions } from "./markdownParser";

export interface MarkdownCanvasProps extends Omit<JsonCanvasProps, "value" | "defaultValue"> {
  /** Markdown document (with optional frontmatter) describing the canvas. */
  markdown: string;
  /** Layout/parsing options (also configurable via document frontmatter). */
  options?: MarkdownCanvasOptions;
}

/**
 * Render (and edit) a canvas authored as Markdown + frontmatter.
 *
 * The Markdown is parsed once into canvas data; edits happen in-memory and are
 * reported via `onChange` as `CanvasData` (they are not serialized back to
 * Markdown). The canvas remounts when the `markdown` prop changes.
 *
 * Import the stylesheet once: `import "json-canvas-react/styles.css";`
 */
export function MarkdownCanvas({ markdown, options, ...rest }: MarkdownCanvasProps) {
  const data = useMemo(() => parseMarkdownCanvas(markdown, options), [markdown, options]);
  return <JsonCanvas key={markdown} defaultValue={data} {...rest} />;
}
