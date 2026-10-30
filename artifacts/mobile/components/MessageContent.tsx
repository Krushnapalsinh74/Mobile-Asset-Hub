import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { saveQuestions } from '@/store/questionStore';
import { getId } from '@/services/api';
import type { Subject, Chapter } from '@/services/api';
import katex from 'katex';

const SUPER: Record<string, string> = {
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
  '+':'⁺','-':'⁻','n':'ⁿ','i':'ⁱ','x':'ˣ','a':'ᵃ','b':'ᵇ',
};
const SUB: Record<string, string> = {
  '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
  '+':'₊','-':'₋','n':'ₙ','i':'ᵢ','e':'ₑ','x':'ₓ','y':'ᵧ','z':'𝓏','k':'ₖ','m':'ₘ',
};

function toSuper(s: string): string {
  if (s.length === 1 && SUPER[s]) return SUPER[s];
  return s.split('').map(c => SUPER[c] ?? c).join('');
}
function toSub(s: string): string {
  if (s.length === 1 && SUB[s]) return SUB[s];
  return s.split('').map(c => SUB[c] ?? c).join('');
}

function extractBalanced(str: string, startIdx: number): { content: string; endIndex: number } | null {
  if (str[startIdx] !== '{') return null;
  let depth = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return { content: str.slice(startIdx + 1, i), endIndex: i };
    }
  }
  return null;
}

function replaceBalancedCommand(str: string, cmdName: string, replacer: (content: string) => string): string {
  let result = '';
  let i = 0;
  const prefix = cmdName + '{';
  while (i < str.length) {
    const idx = str.indexOf(prefix, i);
    if (idx === -1) {
      result += str.slice(i);
      break;
    }
    result += str.slice(i, idx);
    const braceStart = idx + cmdName.length;
    const match = extractBalanced(str, braceStart);
    if (match) {
      result += replacer(match.content);
      i = match.endIndex + 1;
    } else {
      result += str.slice(idx, braceStart + 1);
      i = braceStart + 1;
    }
  }
  return result;
}

function replaceFrac(str: string): string {
  let result = '';
  let i = 0;
  while (i < str.length) {
    const fIdx = str.indexOf('\\frac{', i);
    const tfIdx = str.indexOf('\\tfrac{', i);
    const dfIdx = str.indexOf('\\dfrac{', i);
    const candidates = [
      { idx: fIdx, len: 5 },
      { idx: tfIdx, len: 6 },
      { idx: dfIdx, len: 6 },
    ].filter(x => x.idx !== -1).sort((a, b) => a.idx - b.idx);

    if (candidates.length === 0) {
      result += str.slice(i);
      break;
    }
    const { idx, len } = candidates[0];
    result += str.slice(i, idx);
    const num = extractBalanced(str, idx + len);
    if (num) {
      let after = num.endIndex + 1;
      while (after < str.length && /\s/.test(str[after])) after++;
      if (str[after] === '{') {
        const den = extractBalanced(str, after);
        if (den) {
          result += `(${cleanMath(num.content)})/(${cleanMath(den.content)})`;
          i = den.endIndex + 1;
          continue;
        }
      }
    }
    result += str.slice(idx, idx + len + 1);
    i = idx + len + 1;
  }
  return result;
}

function cleanMath(s: string): string {
  if (!s) return '';
  let out = s;

  // 1. Strip environment wrappers (\begin{aligned}, \begin{matrix}, etc.)
  out = out
    .replace(/\\begin\{(aligned|align\*?|split|gather\*?|equation\*?|cases|matrix|pmatrix|bmatrix|array)\}(\[[^\]]*\])?(\{.*?\})?/gi, '')
    .replace(/\\end\{(aligned|align\*?|split|gather\*?|equation\*?|cases|matrix|pmatrix|bmatrix|array)\}/gi, '');

  // 2. Replace LaTeX double-backslash newlines & alignment tabs
  out = out.split('\\\\').join('\n');
  out = out.replace(/(?:^|\n)\s*&(=|≈|≤|≥|>|<|\+|\-|\*|×)/g, '\n$1');
  out = out.replace(/&/g, ' ');

  // Degrees: replace before superscript handling to prevent \circ turning into \ⁱrc
  out = out
    .replace(/\^\{\\circ\}/g, '°')
    .replace(/\^\\circ/g, '°')
    .replace(/\^\{\\degree\}/g, '°')
    .replace(/\^\\degree/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\\degree/g, '°');

  out = replaceFrac(out);
  out = replaceBalancedCommand(out, '\\sqrt', c => `√(${cleanMath(c)})`);
  out = replaceBalancedCommand(out, '\\boxed', c => cleanMath(c));
  out = replaceBalancedCommand(out, '\\text', c => c);
  out = replaceBalancedCommand(out, '\\mathbf', c => cleanMath(c));
  out = replaceBalancedCommand(out, '\\mathrm', c => cleanMath(c));
  out = replaceBalancedCommand(out, '\\mathit', c => cleanMath(c));
  out = replaceBalancedCommand(out, '\\vec', c => cleanMath(c) + '⃗');
  out = replaceBalancedCommand(out, '\\hat', c => cleanMath(c) + '̂');
  out = replaceBalancedCommand(out, '\\overrightarrow', c => cleanMath(c) + '⃗');

  // Short sqrt forms: \sqrt{3}, \sqrt 3, \sqrt3
  out = out
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, (_, x) => `√(${cleanMath(x)})`)
    .replace(/\\sqrt\s*([0-9A-Za-z])/g, (_, x) => `√${x}`);

  // 4. Superscript / subscript with balanced braces
  out = replaceBalancedCommand(out, '^', c => toSuper(c));
  out = replaceBalancedCommand(out, '_', c => toSub(c));

  // 5. Short commands & single characters
  out = out
    .replace(/\\displaystyle/g, '')
    .replace(/\\left\|/g, '∣').replace(/\\right\|/g, '∣')
    .replace(/\|([^|]+)\|/g, '∣$1∣')
    .replace(/\\left\(/g, '(').replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[').replace(/\\right\]/g, ']')
    .replace(/\\left\{/g, '{').replace(/\\right\}/g, '}')
    .replace(/\\vec\s*([A-Za-z])/g, '$1⃗')
    .replace(/\\hat\s*([A-Za-z])/g, '$1̂')
    .replace(/\\hat\s*\\imath/g, 'î')
    .replace(/\^([0-9A-Za-z])/g, (_, x) => toSuper(x))
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
    .replace(/\\rightarrow/g, ' → ').replace(/\\leftarrow/g, ' ← ')
    .replace(/\\Rightarrow/g, ' ⇒ ').replace(/\\Leftarrow/g, ' ⇐ ')
    .replace(/\\to/g, ' → ')
    .replace(/\\quad/g, '  ').replace(/\\qquad/g, '    ')
    .replace(/\\\s+/g, ' ')
    .replace(/\\[,;!]/g, ' ')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return out;
}

function cleanLatex(text: string): string {
  if (!text) return '';
  let s = text
    .replace(/<br\s*\/?>/gi, '\n')
    // Fix isolated bullet lines: "•\nText" -> "• Text"
    .replace(/(?:^|\n)\s*([•\-\*])\s*\n\s*/g, '\n$1 ')
    // Fix isolated numbered lines: "1.\nText" -> "1. Text"
    .replace(/(?:^|\n)\s*(\d+[\.\)])\s*\n\s*/g, '\n$1 ')
    // Block LaTeX \[ ... \]
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n\n:::formula\n${cleanMath(m)}\n:::\n\n`)
    // Block LaTeX $$ ... $$
    .replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, m) => `\n\n:::formula\n${cleanMath(m)}\n:::\n\n`)
    // Inline LaTeX \( ... \)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => {
      const trimmed = m.trim();
      return trimmed.includes('\n') ? `\n\n:::formula\n${cleanMath(trimmed)}\n:::\n\n` : cleanMath(trimmed);
    })
    // Inline LaTeX $ ... $
    .replace(/\$([^$\n]+)\$/g, (_, m) => cleanMath(m))
    .replace(/\$/g, '')
    // Common symbols outside explicit math delimiters
    .replace(/\^\{\\circ\}/g, '°')
    .replace(/\^\\circ/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\\degree/g, '°')
    .replace(/\\times/g, ' × ')
    .replace(/\\cdot/g, ' · ')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, (_, x) => `√(${cleanMath(x)})`)
    .replace(/\\sqrt\s*([0-9A-Za-z])/g, (_, x) => `√${x}`)
    // Fix isolated backslash before space or units outside LaTeX: "60\ km" -> "60 km", "4\ (≈ 14)" -> "4 (≈ 14)"
    .replace(/\\(?=\s|[a-zA-Z]{1,4}\b|\(|\))/g, ' ');

  return s;
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
  | { kind: 'action'; actionType: string; params: Record<string, string> }
  | { kind: 'paragraph'; text: string };

function getActionConfig(actionType: string, params: Record<string, string>) {
  const subject = params.subject || params.subjectName || '';
  const chapter = params.chapter || params.chapterName || '';
  const count = params.count || params.questionCount || '20';
  const solutions = params.solutions === 'true' || params.solutions === '1';

  switch (actionType) {
    case 'pdf': {
      const parts = [subject, chapter, `${count} Questions`, solutions ? 'With Solutions' : 'Answer Key'].filter(Boolean);
      return {
        title: 'Question Paper PDF Generator',
        subtitle: parts.join(' • ') || 'Configure & Download Exam Paper',
        buttonText: 'Open PDF Generator & Download',
        icon: 'document-text',
        btnIcon: 'download-outline',
        color: '#C85C3E',
        route: '/questions-pdf',
        params: {
          subjectName: subject || undefined,
          chapterName: chapter || undefined,
          questionCount: count,
        },
      };
    }
    case 'quiz': {
      const parts = [subject, chapter, `${count} Questions`, 'Interactive Mode'].filter(Boolean);
      return {
        title: 'Interactive Practice Quiz',
        subtitle: parts.join(' • ') || 'Test your understanding with instant feedback',
        buttonText: 'Start Practice Quiz Now',
        icon: 'flash',
        btnIcon: 'play-outline',
        color: '#4F46E5',
        route: '/test-config',
        params: {
          subjectName: subject || undefined,
          chapterName: chapter || undefined,
        },
      };
    }
    case 'cheatsheet':
    case 'formula':
    case 'formulasheet': {
      const parts = [subject, chapter, 'Printable A4 Revision Sheet'].filter(Boolean);
      return {
        title: `${chapter || subject || 'Formula'} Cheat Sheet`,
        subtitle: parts.join(' • ') || 'Master formulas, SI units, and derivations',
        buttonText: 'Print / Save as PDF',
        icon: 'document-text',
        btnIcon: 'print-outline',
        color: '#D97706',
        route: '/chat',
        params: {
          subjectName: subject || undefined,
          chapterName: chapter || undefined,
        },
      };
    }
    case 'flashcard': {
      const parts = [subject, chapter, '3D Flip Cards'].filter(Boolean);
      return {
        title: 'Topic Revision Flashcards',
        subtitle: parts.join(' • ') || 'Quick revision & formula mastery',
        buttonText: 'Practice Flashcards',
        icon: 'albums',
        btnIcon: 'sparkles-outline',
        color: '#D97706',
        route: '/flashcard',
        params: {
          subjectName: subject || undefined,
          chapterName: chapter || undefined,
        },
      };
    }
    case 'report': {
      return {
        title: 'Performance Report & Analytics',
        subtitle: 'Review test scores, accuracy, and weak chapters',
        buttonText: 'View My Report Card',
        icon: 'bar-chart',
        btnIcon: 'analytics-outline',
        color: '#059669',
        route: '/report-card',
        params: {},
      };
    }
    case 'saved': {
      return {
        title: 'Saved Doubts & Questions Bank',
        subtitle: 'Revisit your bookmarked doubts and solutions',
        buttonText: 'Open Saved Doubts',
        icon: 'bookmark',
        btnIcon: 'folder-open-outline',
        color: '#E11D48',
        route: '/saved',
        params: {},
      };
    }
    case 'chapters':
    default: {
      return {
        title: 'Syllabus Chapter Explorer',
        subtitle: subject ? `Explore all ${subject} chapters` : 'Browse Gujarat Board & CBSE curriculum',
        buttonText: 'Browse Chapters',
        icon: 'library',
        btnIcon: 'book-outline',
        color: '#2563EB',
        route: '/chapters',
        params: {
          subjectName: subject || undefined,
        },
      };
    }
  }
}

function parseBlocks(text: string): BlockType[] {
  const cleaned = cleanLatex(text);
  const lines = cleaned.split('\n');
  const blocks: BlockType[] = [];

  let tableHeaders: string[] | null = null;
  let tableRows: string[][] = [];
  let inFormula = false;
  let formulaLines: string[] = [];

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

    if (line.startsWith(':::action:') && line.endsWith(':::')) {
      flushTable();
      const inner = line.slice(10, -3).trim();
      const qIdx = inner.indexOf('?');
      const actionType = (qIdx >= 0 ? inner.slice(0, qIdx) : inner).toLowerCase();
      const qs = qIdx >= 0 ? inner.slice(qIdx + 1) : '';
      const params: Record<string, string> = {};
      qs.split('&').forEach((p) => {
        const eqIdx = p.indexOf('=');
        if (eqIdx > 0) {
          params[decodeURIComponent(p.slice(0, eqIdx).trim())] = decodeURIComponent(p.slice(eqIdx + 1).trim());
        } else if (p.trim()) {
          params[decodeURIComponent(p.trim())] = 'true';
        }
      });
      blocks.push({ kind: 'action', actionType, params });
      continue;
    }

    if (line === ':::formula') {
      flushTable();
      inFormula = true;
      formulaLines = [];
      continue;
    }
    if (inFormula) {
      if (line === ':::') {
        inFormula = false;
        blocks.push({ kind: 'formula', text: formulaLines.join('\n').trim() });
        formulaLines = [];
      } else {
        formulaLines.push(raw);
      }
      continue;
    }

    if (!line) {
      flushTable();
      continue;
    }

    if (/^【(.+)】$/.test(line)) {
      flushTable();
      blocks.push({ kind: 'formula', text: line.slice(1, -1) });
      continue;
    }

    if (line.includes('|')) {
      if (/^[\|:\-\s]+$/.test(line)) {
        continue;
      }
      const rawCells = line.split('|').map(c => c.trim());
      const cells = rawCells.filter((c, idx) => {
        if (idx === 0 && line.startsWith('|') && c === '') return false;
        if (idx === rawCells.length - 1 && line.endsWith('|') && c === '') return false;
        return true;
      });

      if (cells.length >= 2) {
        if (!tableHeaders) {
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        continue;
      }
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
    } else if (/^\*\s+/.test(raw) || /^-\s+/.test(raw) || /^•\s+/.test(raw)) {
      const indent = raw.match(/^(\s*)/)?.[1].length ?? 0;
      blocks.push({ kind: 'bullet', text: line.replace(/^[\*\-•]\s+/, ''), indent });
    } else if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s+(.*)/);
      if (m) blocks.push({ kind: 'numbered', text: m[2], num: m[1] });
    } else {
      blocks.push({ kind: 'paragraph', text: line });
    }
  }

  flushTable();
  if (inFormula && formulaLines.length > 0) {
    blocks.push({ kind: 'formula', text: formulaLines.join('\n').trim() });
  }

  return blocks.filter(b => b.kind !== 'paragraph' || (b as any).text.length > 0);
}

export interface ParsedMCQ {
  question: string;
  options: string[];
  answer: string;
  solution?: string;
  explanation?: string;
}

export function parseQuestionsFromText(text: string): ParsedMCQ[] {
  if (!text) return [];

  // 1. Check if there is an Answer Key section at the end of the text
  const answerKeyMap = new Map<number, string>();
  const answerKeyMatch = text.match(/(?:###\s*Answer\s*Key|\*\*Answer\s*Key\*\*|Answer\s*Key\s*:)([\s\S]*)$/i);
  let mainContent = text;
  if (answerKeyMatch) {
    mainContent = text.slice(0, answerKeyMatch.index);
    const keySection = answerKeyMatch[1];
    const keyLines = [...keySection.matchAll(/(?:(?:Q|Question\s*)?(\d+)[\.\:\)]\s*\(?([A-Ea-e])\)?)/g)];
    for (const km of keyLines) {
      answerKeyMap.set(parseInt(km[1], 10), km[2].toUpperCase());
    }
  }

  // Clean trailing chat text / action tags
  mainContent = mainContent
    .replace(/:::action:[^:]*:::/gi, '')
    .replace(/(?:Feel free to use these questions|When you['’]re ready|click the action card|generate a \*\*customizable PDF\*\*|Best of luck)[\s\S]*$/i, '')
    .trim();

  // 2. Identify question blocks
  let rawBlocks = mainContent.split(/(?:^|\n|---)\s*(?=(?:#{1,4}\s*)?(?:\*{0,2}(?:Question|Problem|Q\.?)\s*\d+(?:[\.\:\)]|\b)|\*{1,2}\d+[\.\:\)]\*{1,2}|\bQ\d+\b|\b\d+[\.\)]\s+))/i);

  if (rawBlocks.length <= 1) {
    const hrBlocks = mainContent.split(/(?:^|\n)\s*(?:---|___|\*\*\*)\s*(?:\n|$)/);
    if (hrBlocks.length > 1) {
      rawBlocks = hrBlocks;
    }
  }

  const results: ParsedMCQ[] = [];
  let questionCounter = 1;

  for (const block of rawBlocks) {
    let trimmed = block.trim();
    if (!trimmed) continue;
    trimmed = trimmed.replace(/^(?:---|___|\*\*\*)\s*/, '').trim();

    // Try to strip question prefix if present: e.g. "Q1.", "Q1", "Question 1:", "1."
    const prefixMatch = trimmed.match(/^(?:#{1,4}\s*)?(?:\*{0,2}(?:Question|Problem|Q\.?)?\s*(\d+)(?:[\.\:\)]|\b)\*{0,2}\s*)/i);
    let qNumber = questionCounter;
    if (prefixMatch) {
      qNumber = parseInt(prefixMatch[1], 10) || questionCounter;
      trimmed = trimmed.slice(prefixMatch[0].length).trim();
    }

    // Extract Explanation
    let explanation = '';
    const expMatch = trimmed.match(/\*{0,2}(?:Explanation|Solution)[\s\:\*\-]+([\s\S]*?)(?:$|---)/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
      trimmed = trimmed.slice(0, expMatch.index).trim();
    }

    // Extract Answer
    let rawAnswer = '';
    const ansMatch = trimmed.match(/\*{0,2}(?:Answer|Correct(?:\s+Option)?|Ans)[\s\:\*\-]+(?:Option\s*)?\(?([A-Ea-e])\)?(?:\s*\)\s*([^\n\-*]+))?/i);
    if (ansMatch) {
      rawAnswer = ansMatch[1].toUpperCase();
      trimmed = trimmed.slice(0, ansMatch.index).trim();
    } else if (answerKeyMap.has(qNumber)) {
      rawAnswer = answerKeyMap.get(qNumber) || '';
    }

    // Extract Options (A, B, C, D)
    const optLetters = ['A', 'B', 'C', 'D'];
    const optIndices: { letter: string; start: number; contentStart: number }[] = [];
    let searchFrom = 0;

    for (const letter of optLetters) {
      const pat = new RegExp(`(?:^|\\n|\\s+[-•*]?\\s*)(?:\\*\\*)?(?:\\(${letter}\\)|${letter}[\\.\\)])(?:\\*\\*)?\\s*`, 'i');
      const subStr = trimmed.slice(searchFrom);
      const m = subStr.match(pat);
      if (m && m.index !== undefined) {
        const actualIndex = searchFrom + m.index;
        const matchLen = m[0].length;
        optIndices.push({
          letter,
          start: actualIndex,
          contentStart: actualIndex + matchLen,
        });
        searchFrom = actualIndex + matchLen;
      } else {
        break;
      }
    }

    let prompt = trimmed;
    const options: string[] = [];

    if (optIndices.length >= 2) {
      prompt = trimmed.slice(0, optIndices[0].start).trim();
      for (let j = 0; j < optIndices.length; j++) {
        const start = optIndices[j].contentStart;
        const end = j + 1 < optIndices.length ? optIndices[j + 1].start : trimmed.length;
        let optVal = trimmed.slice(start, end).trim();
        optVal = optVal.replace(/\s+[-–—•*]$/, '').trim();
        options.push(optVal);
      }
    } else {
      const lineOpts = [...trimmed.matchAll(/(?:^|\n)\s*[-•*]?\s*(?:\(?([A-Ea-e])\)?[.:\-]\s*|\(([A-Ea-e])\)\s*)([^\n]+)/g)];
      if (lineOpts.length >= 2) {
        options.length = 0;
        for (const m of lineOpts) {
          options.push(m[3].trim());
        }
      }
    }

    prompt = prompt.replace(/\s*[-–—•*:]\s*$/, '').replace(/^\*{1,2}|\*{1,2}$/g, '').trim();

    let finalAnswer = rawAnswer;
    if (rawAnswer) {
      const idx = rawAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
      if (options[idx]) {
        finalAnswer = `(${rawAnswer}) ${options[idx]}`;
      } else {
        finalAnswer = `(${rawAnswer})`;
      }
    } else if (options.length > 0) {
      finalAnswer = `(A) ${options[0]}`;
    }

    if (prompt && (options.length >= 2 || finalAnswer || explanation)) {
      const finalExplanation =
        explanation || (finalAnswer ? `The correct choice is ${finalAnswer}.` : '');
      results.push({
        question: prompt,
        options: options.length >= 2 ? options : ['(A)', '(B)', '(C)', '(D)'],
        answer: finalAnswer,
        solution: finalExplanation,
        explanation: finalExplanation,
      });
      questionCounter++;
    }
  }

  // Balance answer distribution if >60% of questions are option A
  const countA = results.filter((r) => {
    const m = (r.answer || '').match(/^[(\[]?([A-Ea-e])[)\]]?/);
    return m && m[1].toUpperCase() === 'A';
  }).length;

  if (results.length >= 2 && countA / results.length >= 0.6) {
    const targetCycle = [0, 1, 2, 3, 1, 2, 0, 3, 2, 1, 3, 0];
    results.forEach((q, idx) => {
      const targetIdx = targetCycle[idx % targetCycle.length];
      shuffleQuestionToTarget(q, targetIdx);
    });
  }

  return results;
}

function shuffleQuestionToTarget(q: ParsedMCQ, targetIndex: number) {
  if (!q.options || q.options.length < 2) return;

  const cleanOptions = q.options.map((opt) => opt.replace(/^[A-Ea-e][\.\)]\s*/, '').trim());

  let origIdx = -1;
  const ansMatch = (q.answer || '').match(/^[(\[]?([A-Ea-e])[)\]]?/);
  if (ansMatch) {
    origIdx = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
  }
  if (origIdx < 0 || origIdx >= cleanOptions.length) {
    origIdx = cleanOptions.findIndex((opt) => (q.answer || '').toLowerCase().includes(opt.toLowerCase()));
  }
  if (origIdx < 0 || origIdx >= cleanOptions.length) {
    origIdx = 0;
  }

  const correctText = cleanOptions[origIdx];
  const target = Math.min(targetIndex, cleanOptions.length - 1);

  const shuffled = [...cleanOptions];
  shuffled.splice(origIdx, 1);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }

  shuffled.splice(target, 0, correctText);

  const origLetter = String.fromCharCode(65 + origIdx);
  const newLetter = String.fromCharCode(65 + target);

  q.options = shuffled;
  q.answer = `(${newLetter}) ${correctText}`;

  let expl = q.explanation || q.solution || '';
  if (expl && origLetter !== newLetter) {
    expl = expl
      .replace(new RegExp(`\\bOption\\s+${origLetter}\\b`, 'gi'), `Option ${newLetter}`)
      .replace(new RegExp(`\\(${origLetter}\\)`, 'g'), `(${newLetter})`)
      .replace(new RegExp(`\\b(?:answer|choice)\\s+(?:is\\s+)?${origLetter}\\b`, 'gi'), `answer is ${newLetter}`);
  }
  q.explanation = expl || (q.answer ? `The correct choice is ${q.answer}.` : '');
  q.solution = q.explanation;
}

function resolveContextIds(
  paramSubject: string,
  paramChapter: string,
  currentSubjectId?: string,
  currentSubjectName?: string,
  currentChapterId?: string,
  currentChapterName?: string,
  subjects?: Subject[],
  chapters?: Chapter[]
) {
  let sId = currentSubjectId || '';
  let sName = paramSubject || currentSubjectName || '';
  let cId = currentChapterId || '';
  let cName = paramChapter || currentChapterName || '';

  if (paramSubject && subjects && subjects.length > 0) {
    const match = subjects.find(
      (s) => s.name.toLowerCase() === paramSubject.toLowerCase()
    );
    if (match) {
      sId = getId(match);
      sName = match.name;
    }
  }

  if (paramChapter && chapters && chapters.length > 0) {
    const match = chapters.find(
      (c) =>
        c.name.toLowerCase().includes(paramChapter.toLowerCase()) ||
        paramChapter.toLowerCase().includes(c.name.toLowerCase())
    );
    if (match) {
      cId = getId(match);
      cName = match.name;
    }
  }

  if (!cId && chapters && chapters.length > 0) {
    cId = getId(chapters[0]);
    if (!cName) cName = chapters[0].name;
  }

  if (!sId && subjects && subjects.length > 0) {
    sId = getId(subjects[0]);
    if (!sName) sName = subjects[0].name;
  }

  return { sId, sName, cId, cName };
}

interface ExamActionHubCardProps {
  actionType: string;
  params: Record<string, string>;
  parsedQuestions: ParsedMCQ[];
  textColor: string;
  currentSubjectId?: string;
  currentSubjectName?: string;
  currentChapterId?: string;
  currentChapterName?: string;
  subjects?: Subject[];
  chapters?: Chapter[];
}

export function ExamActionHubCard({
  actionType,
  params,
  parsedQuestions,
  textColor,
  currentSubjectId,
  currentSubjectName,
  currentChapterId,
  currentChapterName,
  subjects,
  chapters,
}: ExamActionHubCardProps) {
  const initialCount =
    params.count ||
    params.questionCount ||
    (parsedQuestions.length > 0 ? String(parsedQuestions.length) : '10');
  const [selectedCount, setSelectedCount] = useState<string>(
    ['5', '10', '15', '20', '25'].includes(initialCount) ? initialCount : '10'
  );
  const [selectedFormat, setSelectedFormat] = useState<'solutions_end' | 'key_end' | 'none'>(
    params.solutions === 'true' || params.solutions === '1' ? 'solutions_end' : 'key_end'
  );
  const [selectedLang, setSelectedLang] = useState<'en' | 'gu' | 'hi'>('en');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'mixed' | 'easy' | 'medium' | 'hard'>('mixed');

  const { sId, sName, cId, cName } = resolveContextIds(
    params.subject || params.subjectName || '',
    params.chapter || params.chapterName || '',
    currentSubjectId,
    currentSubjectName,
    currentChapterId,
    currentChapterName,
    subjects,
    chapters
  );

  const displaySubject = sName || 'Physics';
  const displayChapter = cName || 'Practice Test';
  const hasDirectQuestions = parsedQuestions.length > 0;

  const handleStartTest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hasDirectQuestions) {
      const countNum = parseInt(selectedCount, 10);
      const questionsToUse = countNum > 0 ? parsedQuestions.slice(0, countNum) : parsedQuestions;
      const sessionId = saveQuestions(questionsToUse as any[]);
      router.push({
        pathname: '/test-quiz' as any,
        params: {
          sessionId,
          subjectId: sId || 'sub_general',
          subjectName: displaySubject,
          chapterId: cId || 'ch_general',
          chapterName: displayChapter,
          mode: 'mcq',
        },
      });
      return;
    }

    router.push({
      pathname: '/test-config' as any,
      params: {
        subjectId: sId,
        subjectName: displaySubject,
        chapterId: cId,
        chapterName: displayChapter,
        wholeChapter: '1',
      },
    });
  };

  const handleOpenPdf = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let sessionId: string | undefined;
    if (hasDirectQuestions) {
      const countNum = parseInt(selectedCount, 10);
      const questionsToUse = countNum > 0 ? parsedQuestions.slice(0, countNum) : parsedQuestions;
      sessionId = saveQuestions(questionsToUse as any[]);
    }
    router.push({
      pathname: '/questions-pdf' as any,
      params: {
        sessionId,
        subjectId: sId,
        subjectName: displaySubject,
        chapterId: cId,
        chapterName: displayChapter,
        questionCount: selectedCount,
        language: selectedLang,
        difficulty: selectedDifficulty,
        solutions:
          selectedFormat === 'solutions_end'
            ? 'true'
            : selectedFormat === 'key_end'
            ? 'key_end'
            : 'false',
      },
    });
  };

  return (
    <View style={hubStyles.card}>
      {/* Header */}
      <View style={hubStyles.headerRow}>
        <View style={hubStyles.headerIconWrap}>
          <Ionicons name="sparkles" size={18} color="#C85C3E" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={hubStyles.badgeRow}>
            <Text style={hubStyles.badgeText}>
              {hasDirectQuestions
                ? `${parsedQuestions.length} Practice Questions Ready in Chat`
                : 'Interactive Test & PDF Hub'}
            </Text>
          </View>
          <Text style={[hubStyles.titleText, { color: textColor }]}>
            {displaySubject} • {displayChapter}
          </Text>
        </View>
      </View>

      {/* Selectable Options Section (Like Questions-to-PDF) */}
      <View style={hubStyles.optionsContainer}>
        {/* Row 1: Question Count */}
        <View style={hubStyles.optionRow}>
          <Text style={hubStyles.optionLabel}>Questions:</Text>
          <View style={hubStyles.pillsRow}>
            {(['5', '10', '15', '20', '25'] as const).map((cnt) => {
              const isSel = selectedCount === cnt;
              return (
                <Pressable
                  key={cnt}
                  style={[hubStyles.pill, isSel && hubStyles.pillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedCount(cnt);
                  }}
                >
                  <Text style={[hubStyles.pillText, isSel && hubStyles.pillTextActive]}>
                    {cnt} Qs
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Row 2: Format / Solutions Mode */}
        <View style={hubStyles.optionRow}>
          <Text style={hubStyles.optionLabel}>PDF Format:</Text>
          <View style={hubStyles.pillsRow}>
            {[
              { id: 'solutions_end', label: 'Full Solutions' },
              { id: 'key_end', label: 'Answer Key Only' },
              { id: 'none', label: 'Exam Mode' },
            ].map((f) => {
              const isSel = selectedFormat === f.id;
              return (
                <Pressable
                  key={f.id}
                  style={[hubStyles.pill, isSel && hubStyles.pillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedFormat(f.id as any);
                  }}
                >
                  <Text style={[hubStyles.pillText, isSel && hubStyles.pillTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Row 3: Difficulty Level */}
        <View style={hubStyles.optionRow}>
          <Text style={hubStyles.optionLabel}>Difficulty:</Text>
          <View style={hubStyles.pillsRow}>
            {[
              { id: 'mixed', label: 'Mixed' },
              { id: 'easy', label: 'Easy' },
              { id: 'medium', label: 'Medium' },
              { id: 'hard', label: 'Hard' },
            ].map((d) => {
              const isSel = selectedDifficulty === d.id;
              return (
                <Pressable
                  key={d.id}
                  style={[hubStyles.pill, isSel && hubStyles.pillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDifficulty(d.id as any);
                  }}
                >
                  <Text style={[hubStyles.pillText, isSel && hubStyles.pillTextActive]}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Row 4: Language */}
        <View style={hubStyles.optionRow}>
          <Text style={hubStyles.optionLabel}>Language:</Text>
          <View style={hubStyles.pillsRow}>
            {[
              { id: 'en', label: '🇬🇧 English' },
              { id: 'gu', label: '🇮🇳 ગુજરાતી' },
              { id: 'hi', label: '🇮🇳 हिंदी' },
            ].map((l) => {
              const isSel = selectedLang === l.id;
              return (
                <Pressable
                  key={l.id}
                  style={[hubStyles.pill, isSel && hubStyles.pillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedLang(l.id as any);
                  }}
                >
                  <Text style={[hubStyles.pillText, isSel && hubStyles.pillTextActive]}>
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Dual Action Buttons */}
      <View style={hubStyles.actionsRow}>
        <Pressable style={hubStyles.testBtn} onPress={handleStartTest}>
          <Ionicons name="play" size={15} color="#FFF" />
          <Text style={hubStyles.testBtnText}>
            {hasDirectQuestions
              ? `Start Test (${selectedCount} Qs)`
              : 'Start Interactive Test'}
          </Text>
        </Pressable>

        <Pressable style={hubStyles.pdfBtn} onPress={handleOpenPdf}>
          <Ionicons name="document-text-outline" size={15} color="#C85C3E" />
          <Text style={hubStyles.pdfBtnText}>Export to PDF</Text>
        </Pressable>
      </View>
    </View>
  );
}

function escapeHtml(value: string): string {
  return (value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] || char);
}

const CHEATSHEET_LATEX_PATTERN = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)(?:[^$\n\\]|\\.)*?\$|\\\(.+?\\\))/g;

function formatInlineHtmlNoMath(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return s;
}

function renderTextWithKatex(text: string): string {
  if (!text) return '';
  let html = '';
  let lastIndex = 0;
  for (const match of text.matchAll(CHEATSHEET_LATEX_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;
    html += formatInlineHtmlNoMath(text.slice(lastIndex, start));
    const displayMode = raw.startsWith('$$') || raw.startsWith('\\[');
    const expression = raw.startsWith('$$')
      ? raw.slice(2, -2)
      : raw.startsWith('\\[') || raw.startsWith('\\(')
        ? raw.slice(2, -2)
        : raw.slice(1, -1);
    try {
      html += katex.renderToString(expression.trim(), {
        displayMode,
        throwOnError: false,
        output: 'html',
        strict: false,
      });
    } catch {
      html += `<code class="math-code">${escapeHtml(expression)}</code>`;
    }
    lastIndex = start + raw.length;
  }
  return html + formatInlineHtmlNoMath(text.slice(lastIndex));
}

function ensureMathDelimiters(text: string): string {
  if (
    /\\(?:vec|hat|sqrt|frac|pm|cos|sin|tan|times|cdot|approx|alpha|beta|theta|omega|lambda|mu|sigma|Delta)/i.test(text) &&
    !text.includes('$') &&
    !text.includes('\\(') &&
    !text.includes('\\[')
  ) {
    return `\\(${text.trim()}\\)`;
  }
  return text;
}

function printHtmlOnWeb(html: string) {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=950,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.warn('Popup print trigger warning:', e);
      }
    }, 600);
    return;
  }

  const oldFrame = document.getElementById('__cheatsheet_print_frame__');
  if (oldFrame && oldFrame.parentNode) {
    oldFrame.parentNode.removeChild(oldFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = '__cheatsheet_print_frame__';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = 'none';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-99999';

  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    let hasTriggered = false;
    const triggerPrint = () => {
      if (hasTriggered) return;
      hasTriggered = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print error:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 60000);
      }
    };
    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => setTimeout(triggerPrint, 350);
    }
    setTimeout(triggerPrint, 700);
  }
}

function generateCheatSheetHtml({
  subject,
  chapter,
  title,
  content,
}: {
  subject: string;
  chapter: string;
  title?: string;
  content: string;
  sectionFilter?: string;
}): string {
  const displayTitle = title || `${chapter} Master Formula Cheat Sheet`;
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const lines = (content || '').split('\n');
  let bodyHtml = '';
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    if (line.startsWith(':::action:') || line.startsWith(':::formula') || line === ':::') {
      i++;
      continue;
    }

    // Horizontal Rule: --- or *** or ___
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line)) {
      bodyHtml += '<hr class="sheet-divider" />';
      i++;
      continue;
    }

    // Major Section Heading:
    const isSectionHeading =
      /^#{1,3}\s+(.*)/.test(line) ||
      /^\d+\.\s+([A-Z\s&,–—\-_/:]+)$/.test(line) ||
      /^(?:\d+\.\s+)?(?:[A-Z0-9\s&,–—\-_/:]+)(?:FORMULAS?|EQUATIONS?|UNITS?|DIMENSIONS?|CONSTANTS?|DERIVATIONS?|PROOFS?|LAWS?|THEOREMS?|TRAPS?|MISTAKES?|SHORTCUTS?|SUMMARY|REVISION|KEY POINTS)/i.test(line);

    if (isSectionHeading) {
      const cleanH = line.replace(/^#{1,3}\s+/, '');
      bodyHtml += `<div class="section-heading">${renderTextWithKatex(cleanH)}</div>`;
      i++;
      continue;
    }

    // Markdown Table: Check if line starts with | and ends with |
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].split('|').slice(1, -1).map((c) => c.trim());
        const rowStartIndex = /^\|[\s\-:|]+\|$/.test(tableLines[1]) ? 2 : 1;

        let tableHtml = '<div class="table-wrap"><table class="cheat-table"><thead><tr>';
        for (const h of headerCells) {
          tableHtml += `<th>${renderTextWithKatex(h)}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';

        for (let r = rowStartIndex; r < tableLines.length; r++) {
          const cells = tableLines[r].split('|').slice(1, -1).map((c) => c.trim());
          tableHtml += '<tr>';
          for (let c = 0; c < headerCells.length; c++) {
            const cellVal = cells[c] || '';
            tableHtml += `<td>${renderTextWithKatex(cellVal)}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table></div>';
        bodyHtml += tableHtml;
        continue;
      }
    }

    // Bullet point: • or - or *
    if (/^[\*\-•]\s+(.*)/.test(line)) {
      const bText = line.replace(/^[\*\-•]\s+/, '');
      bodyHtml += `<div class="bullet-item"><span class="bullet-dot">•</span><span class="bullet-body">${renderTextWithKatex(bText)}</span></div>`;
      i++;
      continue;
    }

    // Step card: "1. Step description" (where not all-caps section heading)
    const stepMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (stepMatch && !isSectionHeading) {
      bodyHtml += `<div class="step-card"><span class="step-num">${stepMatch[1]}</span><span class="step-content">${renderTextWithKatex(stepMatch[2])}</span></div>`;
      i++;
      continue;
    }

    // Formula line: has math delimiters or math operators
    const processedMathLine = ensureMathDelimiters(line);
    CHEATSHEET_LATEX_PATTERN.lastIndex = 0;
    const hasMath = CHEATSHEET_LATEX_PATTERN.test(processedMathLine) || /[\=⃗√±]/.test(processedMathLine);
    CHEATSHEET_LATEX_PATTERN.lastIndex = 0;

    if (hasMath) {
      bodyHtml += `<div class="formula-box">${renderTextWithKatex(processedMathLine)}</div>`;
    } else {
      bodyHtml += `<p class="para-text">${renderTextWithKatex(line)}</p>`;
    }
    i++;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(displayTitle)} - Knowledge Park</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #2D241E;
      background: #FFFFFF;
      margin: 0;
      padding: 16px;
      font-size: 13.5px;
      line-height: 1.55;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #D97706;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      color: #B45309;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      font-size: 11px;
      color: #786558;
      font-weight: 600;
      margin-top: 2px;
    }
    .badge {
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      color: #92400E;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-bar {
      display: flex;
      gap: 16px;
      background: #FAF6F0;
      border: 1px solid #EBDDCF;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 11.5px;
    }
    .meta-item strong {
      color: #92400E;
      margin-right: 4px;
    }
    .section-heading {
      font-size: 14px;
      font-weight: 800;
      color: #92400E;
      border-left: 3.5px solid #D97706;
      padding-left: 8px;
      margin: 16px 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      break-after: avoid;
    }
    .sheet-divider {
      border: none;
      border-top: 1.5px dashed #D97706;
      margin: 14px 0;
      opacity: 0.5;
    }
    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin: 6px 0 2px 0;
      font-weight: 700;
      color: #372A23;
      font-size: 13px;
    }
    .bullet-dot {
      color: #D97706;
      font-size: 14px;
      line-height: 18px;
    }
    .bullet-body {
      flex: 1;
    }
    .formula-box {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-left: 3.5px solid #D97706;
      border-radius: 6px;
      padding: 8px 14px;
      margin: 4px 0 10px 0;
      font-weight: 600;
      color: #78350F;
      font-size: 13.5px;
      display: flex;
      align-items: center;
      break-inside: avoid;
    }
    .table-wrap {
      width: 100%;
      overflow-x: auto;
      margin: 10px 0 16px 0;
      border-radius: 8px;
      border: 1.5px solid #EBDDCF;
      background: #FFFFFF;
      break-inside: avoid;
    }
    .cheat-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    .cheat-table th {
      background: #FAF5EE;
      color: #92400E;
      font-weight: 800;
      padding: 8px 12px;
      border-bottom: 2px solid #D97706;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .cheat-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #EBDDCF;
      color: #372A23;
      vertical-align: middle;
    }
    .cheat-table tr:nth-child(even) {
      background: #FCFAF7;
    }
    .cheat-table tr:last-child td {
      border-bottom: none;
    }
    .katex {
      font-size: 1.08em;
    }
    .formula-box .katex {
      font-size: 1.15em;
    }
    .math-code {
      background: #FEF3C7;
      color: #92400E;
      font-family: monospace;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 12.5px;
      font-weight: 600;
    }
    .step-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 6px 0;
      break-inside: avoid;
    }
    .step-num {
      background: #D97706;
      color: #FFF;
      font-size: 11px;
      font-weight: 800;
      border-radius: 999px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-content {
      flex: 1;
      font-size: 13px;
    }
    .para-text {
      margin: 4px 0 6px 0;
      color: #372A23;
    }
    .footer {
      border-top: 1px solid #EBDDCF;
      margin-top: 24px;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #A8988C;
    }
    @media print {
      body { padding: 0; }
      .formula-box { break-inside: avoid; }
      .section-heading { break-after: avoid; }
      .table-wrap { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-name">Knowledge Park AI Tutor</div>
      <div class="brand-sub">GSEB & CBSE Higher Secondary Curriculum • Formula Master Sheet</div>
    </div>
    <div class="badge">Print-Ready Sheet</div>
  </div>

  <div class="meta-bar">
    <div class="meta-item"><strong>Subject:</strong> ${escapeHtml(subject)}</div>
    <div class="meta-item"><strong>Chapter:</strong> ${escapeHtml(chapter)}</div>
    <div class="meta-item"><strong>Class:</strong> 11 Science</div>
    <div class="meta-item"><strong>Date:</strong> ${todayStr}</div>
  </div>

  <div class="content">
    ${bodyHtml}
  </div>

  <div class="footer">
    <div>Knowledge Park AI • Self-Study Copilot</div>
    <div>Page 1 of 1</div>
  </div>
</body>
</html>`;
}

interface CheatSheetActionHubProps {
  params: Record<string, string>;
  content: string;
  textColor: string;
  currentSubjectId?: string;
  currentSubjectName?: string;
  currentChapterId?: string;
  currentChapterName?: string;
  onQuickPrompt?: (prompt: string) => void;
}

function CheatSheetActionHubCard({
  params,
  content,
  textColor,
  currentSubjectName,
  currentChapterName,
  onQuickPrompt,
}: CheatSheetActionHubProps) {
  const [selectedSection, setSelectedSection] = useState<'all' | 'formulas' | 'derivations' | 'traps'>('all');
  const [isPrinting, setIsPrinting] = useState(false);

  const displaySubject = params.subject || currentSubjectName || 'Physics';
  const displayChapter = params.chapter || currentChapterName || 'Vectors';
  const displayTitle = params.title || `${displayChapter} Formula Cheat Sheet`;

  const SECTIONS = [
    {
      id: 'all' as const,
      label: 'All Sections (Master)',
      prompt: `Please generate the complete 1-Page Master Formula Cheat Sheet for ${displaySubject} • ${displayChapter}. Include all Master Formulas, SI units, dimensional formulas, key derivations, value tables, and examiner traps ready for print.`,
    },
    {
      id: 'formulas' as const,
      label: 'Formulas & SI Units',
      prompt: `Please generate the Formulas & SI Units section for ${displaySubject} • ${displayChapter} with all vector equations, symbols, units, and dimensional formulas.`,
    },
    {
      id: 'derivations' as const,
      label: 'Key Derivations',
      prompt: `Please generate the Key Derivations & Board Proof Steps for ${displaySubject} • ${displayChapter} with clear step-by-step logic for 3-mark & 5-mark exam questions.`,
    },
    {
      id: 'traps' as const,
      label: 'Exam Traps & Shortcuts',
      prompt: `Please generate the Common Examiner Traps, Sign Mistakes, and Golden Exam Shortcuts for ${displaySubject} • ${displayChapter}.`,
    },
  ];

  const handlePrint = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPrinting(true);
    try {
      const html = generateCheatSheetHtml({
        subject: displaySubject,
        chapter: displayChapter,
        title: displayTitle,
        content,
        sectionFilter: selectedSection,
      });

      if (Platform.OS === 'web') {
        printHtmlOnWeb(html);
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      console.error('Failed to print cheat sheet:', e);
      Alert.alert('Print Error', 'Could not open print dialog. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenPreview = () => {
    if (typeof window === 'undefined') return;
    Haptics.selectionAsync();
    const html = generateCheatSheetHtml({
      subject: displaySubject,
      chapter: displayChapter,
      title: displayTitle,
      content,
      sectionFilter: selectedSection,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleAskSection = () => {
    const active = SECTIONS.find((s) => s.id === selectedSection);
    if (active && onQuickPrompt) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onQuickPrompt(active.prompt);
    }
  };

  return (
    <View style={cheatStyles.card}>
      {/* Header */}
      <View style={cheatStyles.headerRow}>
        <View style={cheatStyles.headerIconWrap}>
          <Ionicons name="newspaper-outline" size={18} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={cheatStyles.badgeText}>Formula Cheat Sheet Hub</Text>
          </View>
          <Text style={[cheatStyles.titleText, { color: textColor }]}>
            {displaySubject} • {displayChapter}
          </Text>
        </View>
      </View>

      {/* Selectable Options Section */}
      <View style={cheatStyles.optionsContainer}>
        <Text style={cheatStyles.optionLabel}>Choose Section / Content to Focus:</Text>
        <View style={cheatStyles.pillsRow}>
          {SECTIONS.map((sec) => {
            const isSel = selectedSection === sec.id;
            return (
              <Pressable
                key={sec.id}
                style={[cheatStyles.pill, isSel && cheatStyles.pillActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedSection(sec.id);
                }}
              >
                <Text style={[cheatStyles.pillText, isSel && cheatStyles.pillTextActive]}>
                  {sec.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Actions Row */}
      <View style={cheatStyles.actionsRow}>
        <Pressable
          style={[cheatStyles.printBtn, isPrinting && { opacity: 0.7 }]}
          onPress={handlePrint}
          disabled={isPrinting}
        >
          <Ionicons name="print-outline" size={16} color="#FFF" />
          <Text style={cheatStyles.printBtnText}>
            {isPrinting ? 'Preparing PDF...' : 'Print / Save as PDF'}
          </Text>
        </Pressable>

        {onQuickPrompt && (
          <Pressable style={cheatStyles.promptBtn} onPress={handleAskSection}>
            <Ionicons name="sparkles" size={14} color="#D97706" />
            <Text style={cheatStyles.promptBtnText}>Ask AI in Chat</Text>
          </Pressable>
        )}

        {Platform.OS === 'web' && (
          <Pressable style={cheatStyles.previewBtn} onPress={handleOpenPreview} accessibilityLabel="Preview sheet in new tab">
            <Ionicons name="open-outline" size={15} color="#92400E" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface Props {
  content: string;
  isUser: boolean;
  primaryColor: string;
  textColor: string;
  cardColor: string;
  borderColor: string;
  mutedColor: string;
  currentSubjectId?: string;
  currentSubjectName?: string;
  currentChapterId?: string;
  currentChapterName?: string;
  subjects?: Subject[];
  chapters?: Chapter[];
  onQuickPrompt?: (prompt: string) => void;
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

export function MessageContent({
  content,
  isUser,
  primaryColor,
  textColor,
  cardColor,
  borderColor,
  mutedColor,
  currentSubjectId,
  currentSubjectName,
  currentChapterId,
  currentChapterName,
  subjects,
  chapters,
  onQuickPrompt,
}: Props) {
  const blocks = parseBlocks(content);
  const baseColor = isUser ? '#FFFFFF' : textColor;
  const linkColor = isUser ? '#CCDDFF' : primaryColor;

  const parsedQuestions = useMemo(() => {
    if (isUser) return [];
    return parseQuestionsFromText(content);
  }, [content, isUser]);

  const hasExamActionBlock = blocks.some(
    (b) => b.kind === 'action' && ['quiz', 'test', 'pdf'].includes(b.actionType.toLowerCase())
  );
  const hasCheatSheetActionBlock = blocks.some(
    (b) => b.kind === 'action' && ['cheatsheet', 'formula', 'formulasheet'].includes(b.actionType.toLowerCase())
  );
  const isCheatSheetContent =
    content.toLowerCase().includes('formula cheat sheet') ||
    content.toLowerCase().includes('master cheat sheet') ||
    (content.toLowerCase().includes('master formulas') && content.toLowerCase().includes('si unit'));

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
              <View
                key={i}
                style={[
                  styles.formulaBox,
                  {
                    backgroundColor: isUser ? 'rgba(255,255,255,0.12)' : primaryColor + '0A',
                    borderLeftColor: isUser ? '#FFFFFF' : primaryColor,
                  },
                ]}
              >
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
                  <InlineText raw={block.text} baseColor={baseColor} primaryColor={linkColor} size={14.5} />
                </View>
              </View>
            );
          case 'numbered':
            return (
              <View key={i} style={styles.numberedRow}>
                <Text style={[styles.numberedPrefix, { color: isUser ? '#FFFFFF' : primaryColor }]}>
                  {block.num}.
                </Text>
                <View style={styles.bulletText}>
                  <InlineText raw={block.text} baseColor={baseColor} primaryColor={linkColor} size={14.5} />
                </View>
              </View>
            );
          case 'table':
            return (
              <View key={i} style={[styles.tableWrap, { borderColor: isUser ? 'rgba(255,255,255,0.15)' : borderColor + '40' }]}>
                <View style={[styles.tableHeaderRow, { backgroundColor: isUser ? 'rgba(255,255,255,0.14)' : primaryColor + '12', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isUser ? 'rgba(255,255,255,0.2)' : borderColor + '30' }]}>
                  {block.headers.map((h, j) => (
                    <View key={j} style={styles.tableCell}>
                      <InlineText raw={h} baseColor={isUser ? '#FFFFFF' : primaryColor} primaryColor={linkColor} bold size={13} />
                    </View>
                  ))}
                </View>
                {block.rows.map((row, ri) => (
                  <View key={ri} style={[styles.tableRow, ri > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isUser ? 'rgba(255,255,255,0.08)' : borderColor + '20' }]}>
                    {row.map((cell, ci) => (
                      <View key={ci} style={styles.tableCell}>
                        <InlineText raw={cell} baseColor={baseColor} primaryColor={linkColor} size={13} />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );
          case 'action': {
            if (['quiz', 'test', 'pdf'].includes(block.actionType.toLowerCase())) {
              return (
                <ExamActionHubCard
                  key={i}
                  actionType={block.actionType}
                  params={block.params}
                  parsedQuestions={parsedQuestions}
                  textColor={textColor}
                  currentSubjectId={currentSubjectId}
                  currentSubjectName={currentSubjectName}
                  currentChapterId={currentChapterId}
                  currentChapterName={currentChapterName}
                  subjects={subjects}
                  chapters={chapters}
                />
              );
            }
            if (['cheatsheet', 'formula', 'formulasheet'].includes(block.actionType.toLowerCase())) {
              return (
                <CheatSheetActionHubCard
                  key={i}
                  params={block.params}
                  content={content}
                  textColor={textColor}
                  currentSubjectId={currentSubjectId}
                  currentSubjectName={currentSubjectName}
                  currentChapterId={currentChapterId}
                  currentChapterName={currentChapterName}
                  onQuickPrompt={onQuickPrompt}
                />
              );
            }
            const conf = getActionConfig(block.actionType, block.params);
            return (
              <View key={i} style={[styles.actionCard, { borderColor: conf.color + '45' }]}>
                <View style={styles.actionCardTop}>
                  <View style={[styles.actionIconWrap, { backgroundColor: conf.color + '18' }]}>
                    <Ionicons name={conf.icon as any} size={22} color={conf.color} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.actionTitle, { color: textColor }]}>{conf.title}</Text>
                    <Text style={styles.actionSubtitle} numberOfLines={2}>{conf.subtitle}</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: conf.color }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({ pathname: conf.route as any, params: conf.params });
                  }}
                >
                  <Ionicons name={conf.btnIcon as any} size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>{conf.buttonText}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </Pressable>
              </View>
            );
          }
          case 'paragraph':
          default:
            return (
              <Text key={i} style={styles.para}>
                <InlineText raw={(block as any).text} baseColor={baseColor} primaryColor={linkColor} size={15} />
              </Text>
            );
        }
      })}

      {/* If AI output contains questions directly in text and no explicit exam action card exists */}
      {!isUser && parsedQuestions.length > 0 && !hasExamActionBlock && (
        <ExamActionHubCard
          actionType="quiz"
          params={{
            count: String(parsedQuestions.length),
            subject: currentSubjectName || '',
            chapter: currentChapterName || '',
          }}
          parsedQuestions={parsedQuestions}
          textColor={textColor}
          currentSubjectId={currentSubjectId}
          currentSubjectName={currentSubjectName}
          currentChapterId={currentChapterId}
          currentChapterName={currentChapterName}
          subjects={subjects}
          chapters={chapters}
        />
      )}

      {/* If AI output contains a formula cheat sheet and no explicit cheat sheet action block exists */}
      {!isUser && isCheatSheetContent && !hasCheatSheetActionBlock && (
        <CheatSheetActionHubCard
          params={{
            subject: currentSubjectName || 'Physics',
            chapter: currentChapterName || 'Vectors',
          }}
          content={content}
          textColor={textColor}
          currentSubjectId={currentSubjectId}
          currentSubjectName={currentSubjectName}
          currentChapterId={currentChapterId}
          currentChapterName={currentChapterName}
          onQuickPrompt={onQuickPrompt}
        />
      )}
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
    borderRadius: 8,
    borderLeftWidth: 3.5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginVertical: 4,
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
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 3,
  },
  numberedPrefix: {
    fontSize: 14.5,
    fontWeight: '700',
    minWidth: 18,
    lineHeight: 22,
  },
  para: { lineHeight: 22, marginBottom: 1 },
  tableWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 8,
  },
  tableHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row' },
  tableCell: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  tableCellHeader: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tableCellText: { fontSize: 12, lineHeight: 18 },
  actionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#FFFDF9',
    padding: 14,
    marginVertical: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 12.5,
    color: '#76645B',
    lineHeight: 17,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

const hubStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EBDDCF',
    padding: 14,
    marginVertical: 10,
    shadowColor: '#C85C3E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FDECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#C85C3E',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  titleText: {
    fontSize: 14.5,
    fontWeight: '800',
    marginTop: 1,
  },
  optionsContainer: {
    backgroundColor: '#FAF5EF',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECE3D8',
  },
  optionRow: {
    gap: 4,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#76645B',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E5DCD1',
  },
  pillActive: {
    backgroundColor: '#C85C3E',
    borderColor: '#C85C3E',
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#5E4B42',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testBtn: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#C85C3E',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF5EF',
    borderWidth: 1.5,
    borderColor: '#C85C3E',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  pdfBtnText: {
    color: '#C85C3E',
    fontSize: 12.5,
    fontWeight: '700',
  },
});

const cheatStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: 14,
    marginVertical: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  titleText: {
    fontSize: 14.5,
    fontWeight: '800',
    marginTop: 1,
  },
  optionsContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pillActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#92400E',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  printBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  printBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  promptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: '#D97706',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  promptBtnText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
  },
  previewBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    width: 42,
    borderRadius: 12,
  },
});
