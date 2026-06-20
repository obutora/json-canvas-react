import type { ReactNode } from "react";

/**
 * A deliberately tiny, dependency-free Markdown renderer covering the subset
 * commonly found in canvas text cards: headings, bold/italic/strikethrough,
 * inline code, links, fenced code blocks, blockquotes, lists, and rules.
 *
 * For full CommonMark/GFM, pass your own `renderText` to <JsonCanvas> (e.g.
 * react-markdown). This keeps the core bundle free of a Markdown dependency.
 */

let keySeq = 0;
function key(): string {
  return `md-${keySeq++}`;
}

const INLINE_RX =
  /(\[\[[^\]\n]+\]\])|(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)|(~~[^~]+~~)|(\[[^\]]+\]\([^)]+\))/;

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  while (rest.length > 0) {
    const m = INLINE_RX.exec(rest);
    if (!m || m.index === undefined) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const tok = m[0];
    if (tok.startsWith("[[")) {
      const inner = tok.slice(2, -2);
      const bar = inner.indexOf("|");
      const target = (bar >= 0 ? inner.slice(0, bar) : inner).trim();
      const label = (bar >= 0 ? inner.slice(bar + 1) : inner).trim();
      out.push(
        <span key={key()} className="rjc-wikilink" data-target={target}>
          {label}
        </span>,
      );
    } else if (tok.startsWith("`")) {
      out.push(<code key={key()}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**") || tok.startsWith("__")) {
      out.push(<strong key={key()}>{renderInline(tok.slice(2, -2))}</strong>);
    } else if (tok.startsWith("~~")) {
      out.push(<del key={key()}>{renderInline(tok.slice(2, -2))}</del>);
    } else if (tok.startsWith("[")) {
      const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      out.push(
        <a key={key()} href={lm[2]} target="_blank" rel="noreferrer noopener">
          {renderInline(lm[1])}
        </a>,
      );
    } else {
      // single * or _ emphasis
      out.push(<em key={key()}>{renderInline(tok.slice(1, -1))}</em>);
    }
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

function renderBlocks(src: string): ReactNode[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre key={key()}>
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      blocks.push(<Tag key={key()}>{renderInline(h[2])}</Tag>);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key()} />);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(<blockquote key={key()}>{renderBlocks(buf.join("\n"))}</blockquote>);
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(<li key={key()}>{renderInline(lines[i].replace(/^[-*+]\s+/, ""))}</li>);
        i++;
      }
      blocks.push(<ul key={key()}>{items}</ul>);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(<li key={key()}>{renderInline(lines[i].replace(/^\d+\.\s+/, ""))}</li>);
        i++;
      }
      blocks.push(<ol key={key()}>{items}</ol>);
      continue;
    }

    // Paragraph (consume until blank line)
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,6}\s|>|```|[-*+]\s|\d+\.\s)/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key()}>
        {para.map((p, idx) => (
          <span key={idx}>
            {idx > 0 ? <br /> : null}
            {renderInline(p)}
          </span>
        ))}
      </p>,
    );
  }

  return blocks;
}

export interface MiniMarkdownProps {
  text: string;
  className?: string;
}

/** Render a Markdown string with the built-in mini renderer. */
export function MiniMarkdown({ text, className }: MiniMarkdownProps): JSX.Element {
  return <div className={className}>{renderBlocks(text ?? "")}</div>;
}
