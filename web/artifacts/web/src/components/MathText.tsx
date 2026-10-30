import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ── LaTeX pattern ─────────────────────────────────────────────────────────
const PATTERN =
  /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)(?:[^$\n\\]|\\.)*?\$|\\\((?:[^)\\]|\\.)*?\\\))/g;

// ── SVG diagram extractor ─────────────────────────────────────────────────
// Matches <diagram type="svg">…</diagram> embedded in question text.
const DIAGRAM_SVG_RE = /<diagram[^>]*type=["']svg["'][^>]*>([\s\S]*?)<\/diagram>/g;

function extractDiagrams(text: string): { text: string; diagrams: string[] } {
  const diagrams: string[] = [];
  const out = text.replace(DIAGRAM_SVG_RE, (_match, svgContent: string) => {
    // Unescape literal \n / \" sequences that arrive from JSON-serialised strings
    const svg = svgContent.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    const html = `<div style="margin:12px 0;overflow-x:auto;text-align:center;">${svg}</div>`;
    const idx = diagrams.length;
    diagrams.push(html);
    return `\x00DIAG${idx}\x00`; // null-byte placeholder survives escapeHtml
  });
  return { text: out, diagrams };
}

// ── HTML escape ───────────────────────────────────────────────────────────
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── LaTeX + SVG renderer ──────────────────────────────────────────────────
function renderLatex(text: string): string {
  if (!text) return '';

  // Extract SVG diagram blocks before any HTML-escaping
  const { text: safeText, diagrams } = extractDiagrams(text);

  let result = '';
  let lastIndex = 0;

  for (const match of safeText.matchAll(PATTERN)) {
    result += escapeHtml(safeText.slice(lastIndex, match.index));
    const raw = match[0];
    const isDisplay = raw.startsWith('$$') || raw.startsWith('\\[');
    let inner = raw;
    if (raw.startsWith('$$'))       inner = raw.slice(2, -2);
    else if (raw.startsWith('\\[')) inner = raw.slice(2, -2);
    else if (raw.startsWith('$'))   inner = raw.slice(1, -1);
    else if (raw.startsWith('\\(')) inner = raw.slice(2, -2);
    try {
      result += katex.renderToString(inner.trim(), {
        displayMode: isDisplay, throwOnError: false, output: 'html', strict: false,
      });
    } catch { result += escapeHtml(raw); }
    lastIndex = match.index! + raw.length;
  }
  result += escapeHtml(safeText.slice(lastIndex));

  // Restore SVG diagram blocks
  if (diagrams.length) {
    result = result.replace(/\x00DIAG(\d+)\x00/g, (_, i) => diagrams[+i]);
  }

  // Convert basic markdown-like bold/italic (optional but helpful for AI responses)
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Handle newlines
  result = result.replace(/\n/g, '<br/>');

  return result;
}

// ── Component types ───────────────────────────────────────────────────────
interface MathTextProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}

export function MathText({ text, style, className }: MathTextProps) {
  if (!text) return null;

  return (
    <div
      className={className}
      style={{
        wordBreak: 'break-word',
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: renderLatex(text) }}
    />
  );
}
