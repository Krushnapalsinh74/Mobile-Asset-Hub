import katex from 'katex';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';

// ── Inject KaTeX CSS once on web ──────────────────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const ID = '__katex_styles__';
  if (!document.getElementById(ID)) {
    const link = document.createElement('link');
    link.id = ID;
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';
    document.head.appendChild(link);

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

// ── LaTeX parser (shared web + native) ───────────────────────────────────
const PATTERN =
  /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)(?:[^$\n\\]|\\.)*?\$|\\\((?:[^)\\]|\\.)*?\\\))/g;

function renderLatex(text: string): string {
  if (!text) return '';
  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(PATTERN)) {
    result += escapeHtml(text.slice(lastIndex, match.index));
    const raw = match[0];
    const isDisplay = raw.startsWith('$$') || raw.startsWith('\\[');
    let inner = raw;
    if (raw.startsWith('$$'))    inner = raw.slice(2, -2);
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
  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Build a self-contained HTML page (used by native WebView) ─────────────
function buildHtmlPage(renderedHtml: string, flat: Record<string, any>): string {
  const color      = flat.color      ?? '#1F2937';
  const fontSize   = flat.fontSize   ?? 15;
  const fontWeight = flat.fontWeight ?? 'normal';
  const lineHeight = typeof flat.lineHeight === 'number'
    ? `${flat.lineHeight}px` : '1.55';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:transparent;overflow:hidden}
#t{
  font-size:${fontSize}px;
  color:${color};
  font-weight:${fontWeight};
  font-family:-apple-system,system-ui,sans-serif;
  line-height:${lineHeight};
  word-break:break-word;
  padding:2px 0;
}
.katex{font-size:1em}
.katex-display{margin:4px 0;overflow-x:auto}
</style>
</head>
<body>
<div id="t">${renderedHtml}</div>
<script>
function sendH(){
  var h=document.getElementById('t').scrollHeight;
  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({h:h+4}));
}
if(document.readyState==='complete'){sendH();}
else{window.addEventListener('load',sendH);}
</script>
</body>
</html>`;
}

// ── Component types ───────────────────────────────────────────────────────
interface MathTextProps {
  text: string;
  style?: any;
  numberOfLines?: number;
}

// ── Native renderer (Android / iOS) via WebView ───────────────────────────
function MathTextNative({ text, style }: MathTextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, any>;
  const fontSize: number = flat.fontSize ?? 15;

  // Estimate initial height: ~1.6 lines × fontSize per 40 chars
  const initH = Math.max(fontSize * 2, Math.ceil(text.length / 40) * fontSize * 1.7);
  const [height, setHeight] = useState(initH);
  const rendered = useRef(renderLatex(text));

  const html = buildHtmlPage(rendered.current, flat);

  return (
    <WebView
      source={{ html }}
      style={{ height, backgroundColor: 'transparent' }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      originWhitelist={['*']}
      onMessage={(e) => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          if (d.h && d.h > 0) setHeight(d.h);
        } catch {}
      }}
    />
  );
}

// ── Main export ───────────────────────────────────────────────────────────
/**
 * Drop-in replacement for <Text> that renders LaTeX with KaTeX.
 *  • Web  → <div dangerouslySetInnerHTML> (fast, inline)
 *  • Native → <WebView> with pre-rendered KaTeX HTML + CSS
 */
export default function MathText({ text, style, numberOfLines }: MathTextProps) {
  if (!text) return null;

  // ── Native (Android / iOS) ──
  if (Platform.OS !== 'web') {
    return <MathTextNative text={text} style={style} numberOfLines={numberOfLines} />;
  }

  // ── Web ──
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, any>;
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

  return (
    <div
      style={divStyle}
      dangerouslySetInnerHTML={{ __html: renderLatex(text) }}
    />
  );
}
