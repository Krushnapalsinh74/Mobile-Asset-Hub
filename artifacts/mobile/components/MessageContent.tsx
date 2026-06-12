import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

const SUPER: Record<string, string> = {
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
  '+':'⁺','-':'⁻','n':'ⁿ','i':'ⁱ','x':'ˣ','a':'ᵃ','b':'ᵇ',
};
const SUB: Record<string, string> = {
  '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
  '+':'₊','-':'₋','n':'ₙ','i':'ᵢ','e':'ₑ',
};

function toSuper(s: string): string {
  if (s.length === 1 && SUPER[s]) return SUPER[s];
  return s.split('').map(c => SUPER[c] ?? c).join('');
}
function toSub(s: string): string {
  if (s.length === 1 && SUB[s]) return SUB[s];
  return s.split('').map(c => SUB[c] ?? c).join('');
}

function cleanMath(s: string): string {
  return s
    .replace(/\\vec\{([^}]+)\}/g, (_, x) => cleanMath(x) + '⃗')
    .replace(/\\hat\{([^}]+)\}/g, (_, x) => cleanMath(x) + '̂')
    .replace(/\\overrightarrow\{([^}]+)\}/g, (_, x) => cleanMath(x) + '⃗')
    .replace(/\\text\{([^}]+)\}/g, (_, x) => x)
    .replace(/\\mathbf\{([^}]+)\}/g, (_, x) => cleanMath(x))
    .replace(/\\mathrm\{([^}]+)\}/g, (_, x) => cleanMath(x))
    .replace(/\\sqrt\{([^}]+)\}/g, (_, x) => `√(${cleanMath(x)})`)
    .replace(/\\sqrt\s+([A-Za-z0-9])/g, (_, x) => `√${x}`)
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, a, b) => `(${cleanMath(a)})/(${cleanMath(b)})`)
    .replace(/\\left[\(\[]/g, '(').replace(/\\right[\)\]]/g, ')')
    .replace(/\\left\{/g, '{').replace(/\\right\}/g, '}')
    .replace(/\\left\|/g, '|').replace(/\\right\|/g, '|')
    .replace(/\^\{([^}]+)\}/g, (_, x) => toSuper(x))
    .replace(/\^([0-9A-Za-z])/g, (_, x) => toSuper(x))
    .replace(/\_\{([^}]+)\}/g, (_, x) => toSub(x))
    .replace(/\_([0-9A-Za-z])/g, (_, x) => toSub(x))
    .replace(/\\theta/g, 'θ').replace(/\\Theta/g, 'Θ')
    .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ').replace(/\\Gamma/g, 'Γ')
    .replace(/\\delta/g, 'δ').replace(/\\Delta/g, 'Δ')
    .replace(/\\phi/g, 'φ').replace(/\\Phi/g, 'Φ')
    .replace(/\\omega/g, 'ω').replace(/\\Omega/g, 'Ω')
    .replace(/\\lambda/g, 'λ').replace(/\\Lambda/g, 'Λ')
    .replace(/\\mu/g, 'μ').replace(/\\nu/g, 'ν')
    .replace(/\\sigma/g, 'σ').replace(/\\Sigma/g, 'Σ')
    .replace(/\\pi/g, 'π').replace(/\\Pi/g, 'Π')
    .replace(/\\rho/g, 'ρ').replace(/\\tau/g, 'τ')
    .replace(/\\epsilon/g, 'ε').replace(/\\varepsilon/g, 'ε')
    .replace(/\\kappa/g, 'κ').replace(/\\eta/g, 'η')
    .replace(/\\cos/g, 'cos').replace(/\\sin/g, 'sin').replace(/\\tan/g, 'tan')
    .replace(/\\cot/g, 'cot').replace(/\\sec/g, 'sec').replace(/\\csc/g, 'csc')
    .replace(/\\log/g, 'log').replace(/\\ln/g, 'ln').replace(/\\exp/g, 'exp')
    .replace(/\\times/g, ' × ').replace(/\\cdot/g, ' · ').replace(/\\pm/g, ' ± ')
    .replace(/\\mp/g, ' ∓ ').replace(/\\div/g, ' ÷ ').replace(/\\infty/g, '∞')
    .replace(/\\approx/g, ' ≈ ').replace(/\\neq/g, ' ≠ ')
    .replace(/\\leq/g, ' ≤ ').replace(/\\geq/g, ' ≥ ')
    .replace(/\\lt/g, ' < ').replace(/\\gt/g, ' > ')
    .replace(/\\circ/g, '°')
    .replace(/\\degree/g, '°')
    .replace(/\\rightarrow/g, ' → ').replace(/\\leftarrow/g, ' ← ')
    .replace(/\\Rightarrow/g, ' ⇒ ').replace(/\\Leftarrow/g, ' ⇐ ')
    .replace(/\\to/g, ' → ')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanLatex(text: string): string {
  return text
    .replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, m) => `\n\n【${cleanMath(m.trim())}】\n\n`)
    .replace(/\$([^$\n]+)\$/g, (_, m) => cleanMath(m))
    .replace(/\$/g, '');
}

const URL_RE = /https?:\/\/[^\s\)\]\>\"\']+/g;

interface Segment {
  type: 'text' | 'bold' | 'italic' | 'bold_italic' | 'code' | 'link';
  content: string;
}

function parseInline(raw: string): Segment[] {
  const parts: Segment[] = [];
  let i = 0;
  const s = raw;
  while (i < s.length) {
    const rest = s.slice(i);
    const urlMatch = rest.match(URL_RE);
    const urlStart = urlMatch ? rest.indexOf(urlMatch[0]) : -1;
    const boldItalic = rest.match(/^\*\*\*(.+?)\*\*\*/);
    const bold = rest.match(/^\*\*(.+?)\*\*/);
    const italic = rest.match(/^\*(.+?)\*/);
    const code = rest.match(/^`([^`]+)`/);

    if (boldItalic && (urlStart === -1 || 0 < urlStart)) {
      parts.push({ type: 'bold_italic', content: boldItalic[1] });
      i += boldItalic[0].length;
    } else if (bold && (urlStart === -1 || 0 < urlStart)) {
      parts.push({ type: 'bold', content: bold[1] });
      i += bold[0].length;
    } else if (italic && (urlStart === -1 || 0 < urlStart)) {
      parts.push({ type: 'italic', content: italic[1] });
      i += italic[0].length;
    } else if (code && (urlStart === -1 || 0 < urlStart)) {
      parts.push({ type: 'code', content: code[1] });
      i += code[0].length;
    } else if (urlStart === 0 && urlMatch) {
      parts.push({ type: 'link', content: urlMatch[0] });
      i += urlMatch[0].length;
    } else {
      const nextSpecial = (() => {
        const candidates = [
          rest.search(/\*\*\*/),
          rest.search(/\*\*/),
          rest.search(/\*/),
          rest.search(/`/),
          urlStart >= 0 ? urlStart : Infinity,
        ].filter(n => n > 0);
        return candidates.length ? Math.min(...candidates) : rest.length;
      })();
      parts.push({ type: 'text', content: rest.slice(0, nextSpecial) });
      i += nextSpecial;
    }
  }
  return parts.filter(p => p.content.length > 0);
}

type BlockType =
  | { kind: 'h1' | 'h2' | 'h3' | 'h4'; text: string }
  | { kind: 'rule' }
  | { kind: 'formula'; text: string }
  | { kind: 'bullet'; text: string; indent: number }
  | { kind: 'numbered'; text: string; num: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'paragraph'; text: string };

function parseBlocks(text: string): BlockType[] {
  const cleaned = cleanLatex(text);
  const lines = cleaned.split('\n');
  const blocks: BlockType[] = [];

  let tableHeaders: string[] | null = null;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableHeaders) {
      blocks.push({ kind: 'table', headers: tableHeaders, rows: tableRows });
      tableHeaders = null;
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      flushTable();
      continue;
    }

    if (/^【(.+)】$/.test(line)) {
      flushTable();
      blocks.push({ kind: 'formula', text: line.slice(1, -1) });
      continue;
    }

    if (/^\|/.test(line)) {
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (/^[\|:\-\s]+$/.test(line)) {
        continue;
      }
      if (!tableHeaders) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    }

    flushTable();

    if (/^#{4}\s/.test(line)) {
      blocks.push({ kind: 'h4', text: line.replace(/^#{4}\s+/, '') });
    } else if (/^#{3}\s/.test(line)) {
      blocks.push({ kind: 'h3', text: line.replace(/^#{3}\s+/, '') });
    } else if (/^#{2}\s/.test(line)) {
      blocks.push({ kind: 'h2', text: line.replace(/^#{2}\s+/, '') });
    } else if (/^#\s/.test(line)) {
      blocks.push({ kind: 'h1', text: line.replace(/^#\s+/, '') });
    } else if (/^---+$/.test(line)) {
      blocks.push({ kind: 'rule' });
    } else if (/^\*\s+/.test(raw) || /^-\s+/.test(raw)) {
      const indent = raw.match(/^(\s*)/)?.[1].length ?? 0;
      blocks.push({ kind: 'bullet', text: line.replace(/^[\*\-]\s+/, ''), indent });
    } else if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s+(.*)/);
      if (m) blocks.push({ kind: 'numbered', text: m[2], num: m[1] });
    } else {
      blocks.push({ kind: 'paragraph', text: line });
    }
  }

  flushTable();
  return blocks.filter(b => b.kind !== 'paragraph' || (b as any).text.length > 0);
}

interface Props {
  content: string;
  isUser: boolean;
  primaryColor: string;
  textColor: string;
  cardColor: string;
  borderColor: string;
  mutedColor: string;
}

function InlineText({
  raw,
  baseColor,
  primaryColor,
  bold: forceBold,
  size,
}: {
  raw: string;
  baseColor: string;
  primaryColor: string;
  bold?: boolean;
  size?: number;
}) {
  const segments = parseInline(raw);
  return (
    <Text>
      {segments.map((seg, idx) => {
        const fs = size ?? 15;
        if (seg.type === 'link') {
          return (
            <Text
              key={idx}
              style={{ color: primaryColor, textDecorationLine: 'underline', fontSize: fs }}
              onPress={() => Linking.openURL(seg.content)}
            >
              {seg.content}
            </Text>
          );
        }
        if (seg.type === 'bold') {
          return <Text key={idx} style={{ color: baseColor, fontWeight: '700', fontSize: fs }}>{seg.content}</Text>;
        }
        if (seg.type === 'bold_italic') {
          return <Text key={idx} style={{ color: baseColor, fontWeight: '700', fontStyle: 'italic', fontSize: fs }}>{seg.content}</Text>;
        }
        if (seg.type === 'italic') {
          return <Text key={idx} style={{ color: baseColor, fontStyle: 'italic', fontSize: fs }}>{seg.content}</Text>;
        }
        if (seg.type === 'code') {
          return (
            <Text key={idx} style={{ color: primaryColor, fontFamily: 'monospace', fontSize: fs - 1, backgroundColor: 'rgba(79,70,229,0.1)' }}>
              {` ${seg.content} `}
            </Text>
          );
        }
        return <Text key={idx} style={{ color: baseColor, fontWeight: forceBold ? '700' : '400', fontSize: fs }}>{seg.content}</Text>;
      })}
    </Text>
  );
}

export function MessageContent({ content, isUser, primaryColor, textColor, cardColor, borderColor, mutedColor }: Props) {
  const blocks = parseBlocks(content);
  const baseColor = isUser ? '#FFFFFF' : textColor;
  const linkColor = isUser ? '#CCDDFF' : primaryColor;

  return (
    <View style={styles.root}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h1':
          case 'h2':
            return (
              <View key={i} style={styles.headingWrap}>
                <InlineText raw={block.text} baseColor={baseColor} primaryColor={linkColor} bold size={17} />
              </View>
            );
          case 'h3':
            return (
              <View key={i} style={styles.h3Wrap}>
                <InlineText raw={block.text} baseColor={baseColor} primaryColor={linkColor} bold size={15} />
              </View>
            );
          case 'h4':
            return (
              <View key={i} style={styles.h4Wrap}>
                <InlineText raw={block.text} baseColor={baseColor} primaryColor={linkColor} bold size={14} />
              </View>
            );
          case 'rule':
            return <View key={i} style={[styles.rule, { backgroundColor: isUser ? 'rgba(255,255,255,0.3)' : borderColor }]} />;
          case 'formula':
            return (
              <View key={i} style={[styles.formulaBox, { backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : 'rgba(79,70,229,0.08)', borderColor: isUser ? 'rgba(255,255,255,0.3)' : primaryColor + '40' }]}>
                <Text style={[styles.formulaText, { color: isUser ? '#FFFFFF' : primaryColor }]}>
                  {block.text}
                </Text>
              </View>
            );
          case 'bullet':
            return (
              <View key={i} style={[styles.bulletRow, { marginLeft: block.indent > 0 ? 16 : 0 }]}>
                <Text style={[styles.bulletDot, { color: isUser ? 'rgba(255,255,255,0.7)' : primaryColor }]}>
                  {block.indent > 0 ? '◦' : '•'}
                </Text>
                <View style={styles.bulletText}>
                  <InlineText raw={block.text} baseColor={baseColor} primaryColor={linkColor} size={14} />
                </View>
              </View>
            );
          case 'numbered':
            return (
              <View key={i} style={styles.bulletRow}>
                <View style={[styles.numCircle, { backgroundColor: isUser ? 'rgba(255,255,255,0.25)' : primaryColor + '20' }]}>
                  <Text style={[styles.numText, { color: isUser ? '#FFFFFF' : primaryColor }]}>{block.num}</Text>
                </View>
                <View style={styles.bulletText}>
                  <InlineText raw={block.text} baseColor={baseColor} primaryColor={linkColor} size={14} />
                </View>
              </View>
            );
          case 'table':
            return (
              <View key={i} style={[styles.tableWrap, { borderColor: isUser ? 'rgba(255,255,255,0.3)' : borderColor }]}>
                <View style={[styles.tableHeaderRow, { backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : primaryColor + '15' }]}>
                  {block.headers.map((h, j) => (
                    <View key={j} style={[styles.tableCell, j < block.headers.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: isUser ? 'rgba(255,255,255,0.3)' : borderColor }]}>
                      <Text style={[styles.tableCellHeader, { color: isUser ? '#FFFFFF' : primaryColor }]} numberOfLines={3}>
                        {h}
                      </Text>
                    </View>
                  ))}
                </View>
                {block.rows.map((row, ri) => (
                  <View key={ri} style={[styles.tableRow, { backgroundColor: ri % 2 === 0 ? 'transparent' : (isUser ? 'rgba(255,255,255,0.08)' : borderColor + '30') }]}>
                    {row.map((cell, ci) => (
                      <View key={ci} style={[styles.tableCell, ci < row.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: isUser ? 'rgba(255,255,255,0.3)' : borderColor }]}>
                        <Text style={[styles.tableCellText, { color: baseColor }]} numberOfLines={4}>{cell}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );
          case 'paragraph':
          default:
            return (
              <Text key={i} style={styles.para}>
                <InlineText raw={(block as any).text} baseColor={baseColor} primaryColor={linkColor} size={15} />
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 4 },
  headingWrap: { marginTop: 6, marginBottom: 2 },
  h3Wrap: { marginTop: 4, marginBottom: 1 },
  h4Wrap: { marginTop: 3, marginBottom: 1 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 8, opacity: 0.5 },
  formulaBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 6,
    alignItems: 'center',
  },
  formulaText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 3,
  },
  bulletDot: { fontSize: 15, lineHeight: 22, marginTop: 0 },
  bulletText: { flex: 1 },
  numCircle: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  numText: { fontSize: 11, fontWeight: '700' },
  para: { lineHeight: 22, marginBottom: 1 },
  tableWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 8,
  },
  tableHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' },
  tableCell: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  tableCellHeader: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tableCellText: { fontSize: 12, lineHeight: 18 },
});
