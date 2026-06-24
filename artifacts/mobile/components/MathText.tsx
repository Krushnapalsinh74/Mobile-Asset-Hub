import katex from 'katex';
import { Platform, StyleSheet, Text } from 'react-native';

// ── Inject KaTeX CSS once on web ──────────────────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const ID = '__katex_styles__';
  if (!document.getElementById(ID)) {
    const link = document.createElement('link');
    link.id = ID;
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';
    document.head.appendChild(link);

    // Extra overrides so KaTeX fits neatly inside RN-Web text blocks
    const style = document.createElement('style');
    style.id = ID + '_extra';
    style.textContent = `
      .katex { font-size: 1em !important; line-height: inherit; }
      .katex-display { margin: 6px 0; overflow-x: auto; }
      .katex-display > .katex { text-align: center; }
    `;
    document.head.appendChild(style);
  }
}

// ── LaTeX parser ──────────────────────────────────────────────────────────
/**
 * Splits a string into alternating plain-text / math segments and renders
 * each math segment with KaTeX.  Returns safe HTML.
 */
function renderLatex(text: string): string {
  if (!text) return '';

  // Match (in order): $$...$$, \[...\], $...$, \(...\)
  const PATTERN =
    /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)(?:[^$\n\\]|\\.)*?\$|\\\((?:[^)\\]|\\.)*?\\\))/g;

  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(PATTERN)) {
    const before = text.slice(lastIndex, match.index);
    result += escapeHtml(before);

    const raw = match[0];
    const isDisplay = raw.startsWith('$$') || raw.startsWith('\\[');
    let inner = raw;
    if (raw.startsWith('$$'))   inner = raw.slice(2, -2);
    else if (raw.startsWith('\\[')) inner = raw.slice(2, -2);
    else if (raw.startsWith('$'))   inner = raw.slice(1, -1);
    else if (raw.startsWith('\\(')) inner = raw.slice(2, -2);

    try {
      result += katex.renderToString(inner.trim(), {
        displayMode: isDisplay,
        throwOnError: false,
        output: 'html',
        strict: false,
      });
    } catch {
      result += escapeHtml(raw);
    }

    lastIndex = match.index! + raw.length;
  }

  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Component ─────────────────────────────────────────────────────────────
interface MathTextProps {
  text: string;
  style?: any;
  numberOfLines?: number;
}

/**
 * Drop-in replacement for <Text> that renders LaTeX expressions with KaTeX.
 * On web:   renders a <div> with dangerouslySetInnerHTML.
 * On native: renders plain <Text> (KaTeX is browser-only).
 */
export default function MathText({ text, style, numberOfLines }: MathTextProps) {
  if (!text) return null;

  if (Platform.OS !== 'web') {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const flat = StyleSheet.flatten(style) as Record<string, any> ?? {};

  const divStyle: Record<string, any> = {
    color:      flat.color      ?? 'inherit',
    fontSize:   flat.fontSize   != null ? flat.fontSize   : 'inherit',
    fontWeight: flat.fontWeight ?? 'inherit',
    fontFamily: flat.fontFamily ?? 'inherit',
    letterSpacing: flat.letterSpacing != null ? flat.letterSpacing : 'inherit',
    lineHeight: flat.lineHeight != null
      ? (typeof flat.lineHeight === 'number' ? `${flat.lineHeight}px` : flat.lineHeight)
      : '1.55',
    display: 'block',
    wordBreak: 'break-word',
  };

  if (numberOfLines) {
    divStyle.overflow = 'hidden';
    divStyle.display = '-webkit-box';
    divStyle.WebkitLineClamp = numberOfLines;
    divStyle.WebkitBoxOrient = 'vertical';
  }

  const html = renderLatex(text);

  return (
    <div
      style={divStyle}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
