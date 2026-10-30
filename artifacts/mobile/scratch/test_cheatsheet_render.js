const katex = require('katex');

const LATEX_PATTERN = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)(?:[^$\n\\]|\\.)*?\$|\\\(.+?\\\))/gs;

function escapeHtml(value) {
  return (value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] || char);
}

function formatInlineHtmlNoMath(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return s;
}

function renderTextWithKatex(text) {
  let html = '';
  let lastIndex = 0;
  for (const match of text.matchAll(LATEX_PATTERN)) {
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

function parseCheatSheetMarkdown(content) {
  const lines = (content || '').split('\n');
  let html = '';
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

    // Horizontal Rule
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line)) {
      html += '<hr class="sheet-divider" />';
      i++;
      continue;
    }

    // Section Heading: ## Heading OR "1. CORE FORMULAS & EQUATIONS"
    const isSectionHeading =
      /^#{1,3}\s+(.*)/.test(line) ||
      /^\d+\.\s+([A-Z\s&,–—\-_/:]+)$/.test(line) ||
      /^(?:\d+\.\s+)?(?:[A-Z0-9\s&,–—\-_/:]+)(?:FORMULAS?|EQUATIONS?|UNITS?|DIMENSIONS?|CONSTANTS?|DERIVATIONS?|PROOFS?|LAWS?|THEOREMS?|TRAPS?|MISTAKES?|SHORTCUTS?|SUMMARY|REVISION|KEY POINTS)/i.test(line);

    if (isSectionHeading) {
      const cleanH = line.replace(/^#{1,3}\s+/, '');
      html += `<div class="section-heading">${renderTextWithKatex(cleanH)}</div>`;
      i++;
      continue;
    }

    // Markdown Table: Check if line starts with | and next line has |---
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
        const rowStartIndex = /^\|[\s\-:|]+\|$/.test(tableLines[1]) ? 2 : 1;
        
        let tableHtml = '<div class="table-wrap"><table class="cheat-table"><thead><tr>';
        for (const h of headerCells) {
          tableHtml += `<th>${renderTextWithKatex(h)}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';

        for (let r = rowStartIndex; r < tableLines.length; r++) {
          const cells = tableLines[r].split('|').slice(1, -1).map(c => c.trim());
          tableHtml += '<tr>';
          for (let c = 0; c < headerCells.length; c++) {
            const cellVal = cells[c] || '';
            tableHtml += `<td>${renderTextWithKatex(cellVal)}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table></div>';
        html += tableHtml;
        continue;
      }
    }

    // Bullet point: • or - or *
    if (/^[\*\-•]\s+(.*)/.test(line)) {
      const bText = line.replace(/^[\*\-•]\s+/, '');
      html += `<div class="bullet-item"><span class="bullet-dot">•</span><span class="bullet-body">${renderTextWithKatex(bText)}</span></div>`;
      i++;
      continue;
    }

    // Step card: "1. Step description" (where not all-caps section heading)
    const stepMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (stepMatch && !isSectionHeading) {
      html += `<div class="step-card"><span class="step-num">${stepMatch[1]}</span><span class="step-content">${renderTextWithKatex(stepMatch[2])}</span></div>`;
      i++;
      continue;
    }

    // Formula line: has math delimiters or math operators
    const hasMath = LATEX_PATTERN.test(line) || /[\=⃗√±]/.test(line);
    // Reset regex index
    LATEX_PATTERN.lastIndex = 0;

    if (hasMath) {
      html += `<div class="formula-box">${renderTextWithKatex(line)}</div>`;
    } else {
      html += `<p class="para-text">${renderTextWithKatex(line)}</p>`;
    }
    i++;
  }

  return html;
}

const sampleFromUserScreenshot = `Physics – Vectors: Quick Survey of All Key Revision Material
---

1. CORE FORMULAS & EQUATIONS
• Vector addition/subtraction
\\(\\vec{A}\\pm\\vec{B}= (A_x\\pm B_x)\\hat{i}+(A_y\\pm B_y)\\hat{j}\\)

• Magnitude of a vector
\\(|\\vec{A}|=\\sqrt{A_x^2+A_y^2}\\)

• Dot product
\\(\\vec{A}\\cdot\\vec{B}=AB\\cos\\theta = A_xB_x+A_yB_y\\)

• Cross product (2-D)
\\(\\vec{A}\\times\\vec{B}= (A_xB_y-A_yB_x)\\hat{k}\\)

• Resultant of two vectors
\\(R=\\sqrt{A^2+B^2+2AB\\cos\\theta}\\)

• Component form of a vector
\\(\\vec{A}=A\\cos\\alpha\\,\\hat{i}+A\\sin\\alpha\\,\\hat{j}\\)

• Unit vector
\\(\\hat{u}=\\frac{\\vec{A}}{|\\vec{A}|}\\)
---

2. SI UNITS, DIMENSIONS & PHYSICAL CONSTANTS
| Quantity | Symbol | SI Unit | Dimension |
|----------|--------|---------|-----------|
| Force | \\(F\\) | newton (N) | \\(M\\,L\\,T^{-2}\\) |
| Mass | \\(m\\) | kilogram (kg) | \\(M\\) |
| Acceleration | \\(a\\) | metres\\(^{-2}\\) (ms\\(^{-2}\\)) | \\(L\\,T^{-2}\\) |
| Displacement | \\(\\vec{r}\\) | metre (m) | \\(L\\) |
| Velocity | \\(\\vec{v}\\) | metres\\(^{-1}\\) (ms\\(^{-1}\\)) | \\(L\\,T^{-1}\\) |
| Momentum | \\(\\vec{p}\\) | kg ms\\(^{-1}\\) | \\(M\\,L\\,T^{-1}\\) |
`;

const res = parseCheatSheetMarkdown(sampleFromUserScreenshot);
console.log('Result HTML length:', res.length);
console.log('Contains table:', res.includes('<table class="cheat-table">'));
console.log('Contains katex rendered:', res.includes('katex'));
console.log('Contains divider:', res.includes('<hr class="sheet-divider" />'));
console.log('Sample snippet:\n', res.slice(0, 500));
