const sampleFormat1 = `
Q1. Vectors A⃗=aî+2aĵ+3ak̂ and B⃗=2aî-aĵ+4ak̂ are given. The magnitude of A⃗ × B⃗ equals
•
A) a²√(35)
•
B) a²√(29)
•
C) a²√(41)
•
D) a²√(53)
**Answer:** C
**Explanation:** Cross product calculation gives magnitude a²√(41).
`;

const sampleFormat2 = `
Two non‑zero vectors P and Q satisfy \\(\\vec{P}\\times(\\vec{P}\\times\\vec{Q}) = \\vec{0}\\). Which of the following must be true? - A) P and Q are parallel. - B) P and Q are perpendicular. - C) ∣ P ∣=∣ Q ∣. - D) P is a zero vector (contradicts the premise).

---
### Answer Key
1. A
2. B
`;

const sampleFormat3 = `
Q1
Two vectors A =3 i^ +4 j^ and B =5 i^ −2 j^ are added. What is the resultant vector R = A + B ? - A) 8 i^ +2 j^ - B) 8 i^ +6 j^ - C) −2 i^ +6 j^ - D) 2 i^ +6 j^ **Answer:** A) 8 i^ +2 j^ **Explanation:** Add components: 3+5=8 (i‑component), \\(4+(-2)=2\\) (j‑component). ---

Q2
The magnitude of vector C =6 i^ −8 j^ is: - A) 10 - B) 14 - C) 2 - D) 12 **Answer:** A) 10 **Explanation:** \\(|\\vec{C}|=\\sqrt{6^{2}+(-8)^{2}}=\\sqrt{36+64}= \\sqrt{100}=10\\). ---
`;

function parseUniversalMCQs(text) {
  if (!text) return [];

  // 1. Check if there is an Answer Key section at the end of the text
  const answerKeyMap = new Map();
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
  // A question block starts with:
  // - Q1 / Question 1 / Problem 1 / 1.
  // - Or separated by '---'
  // - Or if no number, standalone block with A, B, C, D options
  let rawBlocks = mainContent.split(/(?:^|\n|---)\s*(?=(?:#{1,4}\s*)?(?:\*{0,2}(?:Question|Problem|Q\.?)\s*\d+(?:[\.\:\)]|\b)|\*{1,2}\d+[\.\:\)]\*{1,2}|\bQ\d+\b|\b\d+[\.\)]\s+))/i);

  if (rawBlocks.length <= 1) {
    // If splitting by numbered headers didn't yield multiple, try splitting by horizontal rule '---'
    const hrBlocks = mainContent.split(/(?:^|\n)\s*(?:---|___|\*\*\*)\s*(?:\n|$)/);
    if (hrBlocks.length > 1) {
      rawBlocks = hrBlocks;
    }
  }

  const results = [];
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
      rawAnswer = answerKeyMap.get(qNumber);
    }

    // Extract Options (A, B, C, D)
    // Options can be:
    // - Bulleted with • or - or *
    // - On new lines
    // - Inline: "• A) val • B) val" or "- A) val - B) val"
    const optLetters = ['A', 'B', 'C', 'D'];
    const optIndices = [];
    let searchFrom = 0;

    for (const letter of optLetters) {
      // Matches:
      // \n A) or \n • A) or \n - A) or \s • A) or \s - A) or \s A) or (A)
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
    const options = [];

    if (optIndices.length >= 2) {
      prompt = trimmed.slice(0, optIndices[0].start).trim();
      for (let j = 0; j < optIndices.length; j++) {
        const start = optIndices[j].contentStart;
        const end = j + 1 < optIndices.length ? optIndices[j + 1].start : trimmed.length;
        let optVal = trimmed.slice(start, end).trim();
        // Clean trailing separators or bullets
        optVal = optVal.replace(/\s+[-–—•*]$/, '').trim();
        options.push(optVal);
      }
    } else {
      // Fallback: check lines
      const lineOpts = [...trimmed.matchAll(/(?:^|\n)\s*[-•*]?\s*(?:\(?([A-Ea-e])\)?[.:\-]\s*|\(([A-Ea-e])\)\s*)([^\n]+)/g)];
      if (lineOpts.length >= 2) {
        options.length = 0;
        for (const m of lineOpts) {
          options.push(m[3].trim());
        }
      }
    }

    // Clean trailing bullet or dash or colon on prompt
    prompt = prompt.replace(/\s*[-–—•*:]\s*$/, '').replace(/^\*{1,2}|\*{1,2}$/g, '').trim();

    // Format Answer
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
      results.push({
        question: prompt,
        options: options.length >= 2 ? options : ['(A)', '(B)', '(C)', '(D)'],
        answer: finalAnswer,
        solution: explanation,
        explanation,
      });
      questionCounter++;
    }
  }

  return results;
}

console.log('=== TEST FORMAT 1 (Bullets • A) • B)) ===');
console.log(parseUniversalMCQs(sampleFormat1));

console.log('\n=== TEST FORMAT 2 (No Q-number, Answer Key at end) ===');
console.log(parseUniversalMCQs(sampleFormat2));

console.log('\n=== TEST FORMAT 3 (Q1 alone on line, hyphenated options) ===');
console.log(parseUniversalMCQs(sampleFormat3));
