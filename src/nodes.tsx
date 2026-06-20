import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useCanvas } from "./canvasStore";
import type { ResolvedFile } from "./canvasStore";
import { MiniMarkdown } from "./markdown";
import type { FileNode, GroupNode, LinkNode, TextNode } from "./types";

const IMAGE_RX = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)(\?.*)?$/i;

function baseName(path: string): string {
  const clean = path.split(/[?#]/)[0];
  return clean.split("/").pop() || clean;
}

/* ------------------------------- text ----------------------------------- */

export function TextNodeBody({ node, editing }: { node: TextNode; editing: boolean }) {
  const { actions, config } = useCanvas();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  if (editing) {
    return (
      <textarea
        ref={ref}
        className="rjc-text-edit"
        defaultValue={node.text}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => actions.updateNodeSilent(node.id, { text: e.target.value })}
        onBlur={(e) => {
          actions.setEditing(null);
          actions.commit();
          // Return focus to the canvas so keyboard shortcuts keep working.
          (e.target as HTMLElement).closest<HTMLElement>(".rjc-root")?.focus();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
      />
    );
  }

  const content: ReactNode = config.renderText
    ? config.renderText(node)
    : <MiniMarkdown text={node.text} className="rjc-md" />;

  return <div className="rjc-text-body">{content}</div>;
}

/* ------------------------------- file ----------------------------------- */

function defaultResolveFile(node: FileNode): ResolvedFile {
  if (IMAGE_RX.test(node.file)) {
    return { kind: "image", src: node.file, label: baseName(node.file) };
  }
  return { kind: "unknown", label: baseName(node.file) };
}

export function FileNodeBody({ node }: { node: FileNode }) {
  const { config } = useCanvas();
  const resolved = config.resolveFile ? config.resolveFile(node) : defaultResolveFile(node);

  if (resolved.content) return <div className="rjc-file-body">{resolved.content}</div>;

  if (resolved.kind === "image" && resolved.src) {
    return (
      <div className="rjc-file-body rjc-file-image">
        <img src={resolved.src} alt={resolved.label ?? ""} draggable={false} />
      </div>
    );
  }

  if (resolved.kind === "embed" && resolved.src) {
    return (
      <div className="rjc-file-body rjc-file-embed">
        <iframe src={resolved.src} title={resolved.label ?? node.file} />
      </div>
    );
  }

  return (
    <div className="rjc-file-body rjc-file-card">
      <span className="rjc-file-icon" aria-hidden>📄</span>
      <span className="rjc-file-name">{resolved.label ?? baseName(node.file)}</span>
      {node.subpath ? <span className="rjc-file-subpath">{node.subpath}</span> : null}
    </div>
  );
}

/* ------------------------------- link ----------------------------------- */

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function LinkNodeBody({ node }: { node: LinkNode }) {
  const { config } = useCanvas();
  if (config.renderLink) return <div className="rjc-link-body">{config.renderLink(node)}</div>;

  const host = hostOf(node.url);
  return (
    <a
      className="rjc-link-body rjc-link-card"
      href={node.url}
      target="_blank"
      rel="noreferrer noopener"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <img
        className="rjc-link-favicon"
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
        alt=""
        draggable={false}
      />
      <span className="rjc-link-host">{host}</span>
      <span className="rjc-link-url">{node.url}</span>
    </a>
  );
}

/* ------------------------------- group ---------------------------------- */

const BG_STYLE: Record<string, string> = {
  cover: "cover",
  ratio: "contain",
  repeat: "auto",
};

export function GroupNodeBody({ node }: { node: GroupNode }) {
  const bg = node.background
    ? {
        backgroundImage: `url(${node.background})`,
        backgroundSize: BG_STYLE[node.backgroundStyle ?? "cover"] ?? "cover",
        backgroundRepeat: node.backgroundStyle === "repeat" ? "repeat" : "no-repeat",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div className="rjc-group-body" style={bg}>
      {node.label ? <div className="rjc-group-label">{node.label}</div> : null}
    </div>
  );
}
