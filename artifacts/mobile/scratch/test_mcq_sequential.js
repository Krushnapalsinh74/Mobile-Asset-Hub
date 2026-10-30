const sampleQ1 = "Two vectors A = 3i + 4j and B = 5i - 2j are added. What is the resultant vector R = A + B ? - A) 8i + 2j - B) 8i + 6j - C) -2i + 6j - D) 2i + 6j **Answer:** A) 8i + 2j **Explanation:** Add components: 3+5=8 (i-component), \\(4+(-2)=2\\) (j-component). ---";
const sampleQ4 = "The unit vector along D =-2i + 2j is: - A) -1/sqrt(2) i + 1/sqrt(2) j - B) 1/sqrt(2) i - 1/sqrt(2) j - C) -1/2 i + 1/2 j - D) 1/2 i - 1/2 j **Answer:** A) -1/sqrt(2) i + 1/sqrt(2) j **Explanation:** ... ---";
const sampleQ10 = "The vector \\(\\vec{M}= (2\\hat{i} - \\hat{j})\\) is multiplied by a scalar -3. What is the resulting vector? - A) -6i + 3j - B) 6i - 3j - C) -6i - 3j - D) 6i + 3j **Answer:** A) -6i + 3j **Explanation:** Multiply each component by -3: \\(2(-3)=-6\\) for i, \\((-1)(-3)=+3\\) for j. --- Feel free to use these questions directly for a printed paper or an online quiz. When you’re ready, click the action card below to generate a **customizable PDF** :::action:quiz?subject=Physics&chapter=Vector&count=10&solutions=true:::";

function extractMCQ(blockText) {
  let text = blockText
    .replace(/:::action:[^:]*:::/gi, '')
    .replace(/(?:Feel free to use these questions|When you['’]re ready|click the action card|generate a \*\*customizable PDF\*\*|Best of luck)[\s\S]*$/i, '')
    .trim()
    .replace(/^(?:---|___|\*\*\*)\s*/, '')
    .replace(/(?:---|___|\*\*\*)\s*$/, '')
    .trim();

  // Extract Explanation
  let explanation = '';
  const expMatch = text.match(/\*{0,2}(?:Explanation|Solution)[\s\:\*\-]+([\s\S]*?)$/i);
  if (expMatch) {
    explanation = expMatch[1].trim();
    text = text.slice(0, expMatch.index).trim();
  }

  // Extract Answer
  let rawAnswer = '';
  const ansMatch = text.match(/\*{0,2}(?:Answer|Correct(?:\s+Option)?|Ans)[\s\:\*\-]+(?:Option\s*)?\(?([A-Ea-e])\)?(?:\s*\)\s*([^\n\-*]+))?/i);
  if (ansMatch) {
    rawAnswer = ansMatch[1].toUpperCase();
    text = text.slice(0, ansMatch.index).trim();
  }

  // Now find Option A, B, C, D
  // The delimiter for option X is: [-•*]?\s*(?:\(?[A-E]\)?[.:\-]|(?:\(?[A-E]\)\s*))
  // We can search for the indices of A, B, C, D in order!
  const optLetters = ['A', 'B', 'C', 'D'];
  const optIndices = [];

  let searchFrom = 0;
  for (const letter of optLetters) {
    // Look for: [-•*]?\s*A[\.\)] or (A) or **A)** or - A)
    const pat = new RegExp(`(?:^|\\n|\\s+[-•*]?\\s*)(?:\\*\\*)?(?:\\(${letter}\\)|${letter}[\\.\\)])(?:\\*\\*)?\\s*`, 'i');
    const subStr = text.slice(searchFrom);
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

  let prompt = text;
  const options = [];

  if (optIndices.length >= 2) {
    prompt = text.slice(0, optIndices[0].start).trim();
    for (let i = 0; i < optIndices.length; i++) {
      const start = optIndices[i].contentStart;
      const end = i + 1 < optIndices.length ? optIndices[i + 1].start : text.length;
      let optVal = text.slice(start, end).trim();
      // clean trailing hyphens or separators
      optVal = optVal.replace(/\s+[-–—]$/, '').trim();
      options.push(optVal);
    }
  }

  // Clean prompt trailing hyphens or colons
  prompt = prompt.replace(/\s*[-–—:]\s*$/, '').trim();

  // Format Answer
  let finalAnswer = rawAnswer;
  if (rawAnswer) {
    const idx = rawAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
    if (options[idx]) {
      finalAnswer = `(${rawAnswer}) ${options[idx]}`;
    }
  } else if (options.length > 0) {
    finalAnswer = `(A) ${options[0]}`;
  }

  return {
    prompt,
    options,
    answer: finalAnswer,
    explanation,
  };
}

console.log('--- Test Q1 ---');
console.log(extractMCQ(sampleQ1));
console.log('\n--- Test Q4 ---');
console.log(extractMCQ(sampleQ4));
console.log('\n--- Test Q10 ---');
console.log(extractMCQ(sampleQ10));
