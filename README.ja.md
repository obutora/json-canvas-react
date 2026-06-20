# json-canvas-react

[English](./README.md) | 日本語

[JSON Canvas](https://jsoncanvas.org) オープンファイル形式（Obsidian Canvas が使う
`.canvas` 形式）の**表示と編集**を行う、依存の少ない React フレームワークです。

- 📄 JSON Canvas 1.0 を完全サポート — `text` / `file` / `link` / `group` ノード + エッジ
- 🖱️ そのまま使えるエディタ — パン/ズーム、ドラッグ、リサイズ、矩形選択、エッジ描画、
  インライン Markdown 編集、削除、カラー、キーボードショートカット
- 🎨 DOM + CSS transform レンダリング — Markdown & HTML 埋め込みをネイティブに描画。
  CSS 変数でテーマ変更可能。ライト/ダークテーマを内蔵
- 🪶 ランタイム依存なし（React は peer dependency）
- 🧩 text（Markdown）、file、link のレンダラーを差し替え可能
- 📝 JSON だけでなく **Markdown + frontmatter**（`<MarkdownCanvas>`）でも記述可能
- 🔒 `readOnly` ビューアーモード

> ステータス: **0.1（初期版）**。1.0 までに API が変わる可能性があります。

## インストール

```bash
npm install json-canvas-react
```

## キャンバスを記述する2つの方法

| コンポーネント | ソース | 向いている用途 |
| --- | --- | --- |
| `<JsonCanvas>` | JSON Canvas データ（`{ nodes, edges }`） | フルエディタ、`.canvas` ファイル、プログラムによるデータ |
| `<MarkdownCanvas>` | Markdown + frontmatter 文字列 | ノートとして手書きで記述する |

## 使い方（JSON）

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
  // <JsonCanvas> を持つ親要素には固定サイズが必要です。
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <JsonCanvas value={data} onChange={setData} />
    </div>
  );
}
```

`<JsonCanvas>` は親要素を埋めるので、親には明示的なサイズを指定してください。

## 使い方（Markdown + frontmatter）

キャンバスを Markdown ドキュメントとして記述し、`<MarkdownCanvas>` で描画します。
ドキュメントの frontmatter にレイアウトオプションを記述し、本文は `---` の行で
**カード**に分割され、各カードがノードになります。

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

### Markdown キャンバスの書式

- **ドキュメント frontmatter**（先頭の `---` … `---`）: `layout`（`grid` | `row` |
  `column` | `none`）、`columns`、`gap`、`nodeWidth`、`nodeHeight`、`startX`、
  `startY`、`autoLinkEdges`、そして任意で `edges` を**インライン JSON**として記述
  （`edges: [{ "from": "a", "to": "b", "label": "x" }]`）。
- **カード**は `---` だけの行で区切られます。カード*内*で水平線を引くには
  `***` または `___` を使います。
- **カードごとのフィールド**はカード先頭に置く Obsidian スタイルのインラインフィールドです:
  `id::`、`type::`（`text`|`link`|`file`|`group`）、`color::`（`1`–`6` または hex）、
  `x::`、`y::`、`width::`、`height::`、`url::`（link）、`file::`/`subpath::`（file）、
  `label::`（group）。`x::`/`y::` のないカードは自動でレイアウトされます。
- **エッジ**は frontmatter の `edges` リストと、カード本文中の `[[wikilink]]`
  （`[[id]]` または `[[id|label]]`）から生成されます。リンク先はカードの `id::`
  または見出しスラッグに解決されます。
- ID は最初の見出しのスラッグ、次いで `node-1`、`node-2`、… がデフォルトになります。

データへ自分でパースすることもできます:

```tsx
import { parseMarkdownCanvas } from "json-canvas-react";
const data = parseMarkdownCanvas(md); // → { nodes, edges }
```

> `<MarkdownCanvas>` は Markdown をキャンバスデータにパースし、メモリ上では編集可能です
> （`onChange` が `CanvasData` を報告します）が、編集内容は Markdown へは**書き戻されません**。
> `markdown` prop が変わるとキャンバスは再マウントされます。

## 操作

| アクション | ジェスチャー |
| --- | --- |
| パン | スクロール / 空白部分をドラッグ（読み取り専用） / 中ボタンドラッグ / `Space`+ドラッグ |
| ズーム | `Ctrl`/`⌘` + スクロール、またはツールバー |
| 選択 | ノード/エッジをクリック。`Shift`+クリックで複数選択 |
| 矩形選択 | 空白部分をドラッグ |
| 移動 | ノードをドラッグ（グループは中身ごと移動） |
| リサイズ | 角/辺のハンドルをドラッグ |
| 接続 | 4つのエッジドットのいずれかから別のノードへドラッグ |
| テキスト編集 | テキストノードをダブルクリック |
| 削除 | `Delete` / `Backspace` |
| すべて選択 | `Ctrl`/`⌘` + `A` |

## Props

| Prop | 型 | デフォルト | 補足 |
| --- | --- | --- | --- |
| `value` | `CanvasInput` | — | 制御データ。`onChange` と組み合わせて使う |
| `defaultValue` | `CanvasInput` | — | 非制御の初期データ |
| `onChange` | `(data: CanvasData) => void` | — | ジェスチャーの区切りで発火 |
| `readOnly` | `boolean` | `false` | ビューアーモード（パン/ズーム/選択のみ） |
| `gridSize` | `number` | `40` | ドットグリッドの間隔（キャンバス px） |
| `showGrid` | `boolean` | `true` | |
| `snapToGrid` | `boolean` | `false` | 移動/リサイズをスナップ |
| `minZoom` / `maxZoom` | `number` | `0.1` / `4` | |
| `fitOnMount` | `boolean` | `true` | 初回レンダリングで内容をフィット |
| `showControls` | `boolean` | `true` | 組み込みツールバー |
| `theme` | `"light" \| "dark"` | システム | |
| `renderText` | `(node) => ReactNode` | ミニ Markdown | 完全な GFM には react-markdown を使う |
| `resolveFile` | `(node) => ResolvedFile` | 拡張子で判定 | `file` パスを画像/埋め込み/コンテンツへマップ |
| `renderLink` | `(node) => ReactNode` | リンクカード | |
| `onNodeClick` / `onNodeDoubleClick` | `(node, e) => void` | — | |

### カスタム Markdown（完全な GFM）

組み込みのレンダラーはあえて小さく作られています。完全な Markdown には自前のものを差し込めます:

```tsx
import ReactMarkdown from "react-markdown";

<JsonCanvas
  value={data}
  onChange={setData}
  renderText={(node) => <ReactMarkdown>{node.text}</ReactMarkdown>}
/>;
```

### ファイルの解決

`file` ノードはライブラリが読み取れない vault/ワークスペース相対パスを参照します。
描画可能なものへマップしてください:

```tsx
<JsonCanvas
  value={data}
  onChange={setData}
  resolveFile={(node) => ({ kind: "image", src: `/vault/${node.file}` })}
/>;
```

## テーマ

すべての色は `.rjc-root` 上の CSS 変数です。自分の CSS で上書きできます:

```css
.rjc-root {
  --rjc-bg: #fafafa;
  --rjc-node-bg: #fff;
  --rjc-selection: #7c3aed;
  --rjc-color-1: #ef4444; /* 6つのプリセットスロット */
}
```

## 低レベル API

カスタム UI（ミニマップ、カスタムツールバーなど）向けに、パッケージは `useCanvas`、
`useViewport`、`usePanZoomApi`、およびジオメトリヘルパー（`edgeBezier`、`sidePoint`、
`nodesBounds`、…）もエクスポートします。`src/index.ts` を参照してください。

## 開発

```bash
npm install
npm run dev        # Vite プレイグラウンド http://localhost:5174
npm run typecheck
npm run build      # tsup → dist/（+ styles.css）
```

## ライセンス

MIT
