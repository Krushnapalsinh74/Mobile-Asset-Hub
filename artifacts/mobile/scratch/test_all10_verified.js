const fs = require('fs');
const testUserText = `
Q1
Two vectors A =3 i^ +4 j^ and B =5 i^ −2 j^ are added. What is the resultant vector R = A + B ? - A) 8 i^ +2 j^ - B) 8 i^ +6 j^ - C) −2 i^ +6 j^ - D) 2 i^ +6 j^ **Answer:** A) 8 i^ +2 j^ **Explanation:** Add components: 3+5=8 (i‑component), \\(4+(-2)=2\\) (j‑component). ---

Q2
The magnitude of vector C =6 i^ −8 j^ is: - A) 10 - B) 14 - C) 2 - D) 12 **Answer:** A) 10 **Explanation:** \\(|\\vec{C}|=\\sqrt{6^{2}+(-8)^{2}}=\\sqrt{36+64}= \\sqrt{100}=10\\). ---

Q3
If P =4 i^ +3 j^ and Q =−4 i^ +3 j^ , the angle between P and Q is: - A) 0 ∘ - B) 90 ∘ - C) 180 ∘ - D) 60 ∘ **Answer:** B) 90 ∘ **Explanation:** \\(\\vec{P}\\cdot\\vec{Q}=4(-4)+3(3)= -16+9 = -7\\). Since P ⋅ Q =∣ P ∣∣ Q ∣cosθ and ∣ P ∣=∣ Q ∣=5, we have cosθ=−7/25. But cos90 ∘ =0; the dot product should be zero for perpendicular vectors. Actually compute correctly: \\(\\vec{P}\\cdot\\vec{Q}=4(-4)+3(3) = -16+9 = -7\\neq0\\). Hence the angle is not 90 ∘ . Re‑evaluate: ∣ P ∣=5, ∣ Q ∣=5. cosθ=−7/25⇒θ≈106 ∘ . **Correct answer:** None of the given options. ---

Q4
The unit vector along D =−2 i^ +2 j^ is: - A) − 1/sqrt(2) i^ + 1/sqrt(2) j^ - B) 1/sqrt(2) i^ − 1/sqrt(2) j^ - C) − 1/2 i^ + 1/2 j^ - D) 1/2 i^ − 1/2 j^ **Answer:** A) − 1/sqrt(2) i^ + 1/sqrt(2) j^ **Explanation:** \\(|\\vec{D}|=\\sqrt{(-2)^{2}+2^{2}}=\\sqrt{8}=2\\sqrt{2}\\). ---

Q5
Two vectors E =5 i^ +12 j^ and F =−5 i^ +12 j^ are perpendicular. Which of the following statements is true? - A) Their dot product is zero. - B) Their magnitudes are equal. - C) The angle between them is 180 ∘ . - D) Both A and B. **Answer:** D) Both A and B. **Explanation:** \\(\\vec{E}\\cdot\\vec{F}=5(-5)+12(12)= -25+144=119\\neq0\\). Actually the dot product is not zero, so they are **not** perpendicular. The correct answer based on the given options is **B** (magnitudes are equal: ∣ E ∣=∣ F ∣=13). ---

Q6
The vector G =7 i^ is resolved into two perpendicular components G 1 along i^ and G 2 along j^ . What are the components? - A) G 1 =7 i^ , G 2 =0 j^ - B) G 1 =0 i^ , G 2 =7 j^ - C) G 1 =5 i^ , G 2 =5 j^ - D) G 1 =7 j^ , G 2 =0 i^ **Answer:** A) G 1 =7 i^ , G 2 =0 j^ **Explanation:** Since G lies entirely along the x‑axis, its y‑component is zero. ---

Q7
Find the scalar (dot) product of H =3 i^ +4 j^ +5 k^ and I =−1 i^ +2 j^ +3 k^ . - A) 20 - B) 26 - C) 10 - D) −2 **Answer:** B) 26 **Explanation:** \\(\\vec{H}\\cdot\\vec{I}=3(-1)+4(2)+5(3)= -3+8+15=20\\). Oops, that equals **20**. Correct answer: **A) 20**. ---

Q8
The vector J = sqrt(3) i^ + j^ makes an angle θ with the positive x‑axis. Find θ. - A) 30 ∘ - B) 60 ∘ - C) 45 ∘ - D) 75 ∘ **Answer:** A) 30 ∘ **Explanation:** tanθ= 1/sqrt(3). Hence θ=30 ∘ . ---

Q9
Two vectors K =4 i^ +3 j^ and L =k K have the same direction and ∣ L ∣=20. Find the scalar k. - A) 2 - B) 5 - C) 4 - D) 10 **Answer:** B) 5 **Explanation:** ∣ K ∣= sqrt(4^2 + 3^2) =5. Since ∣ L ∣=∣k∣∣ K ∣=∣k∣×5=20, ∣k∣=4. Wait, 20/5=4. So k=4. Correct answer: **C) 4**. ---

Q10
The vector \\(\\vec{M}= (2\\hat{i} - \\hat{j})\\) is multiplied by a scalar −3. What is the resulting vector? - A) −6 i^ +3 j^ - B) 6 i^ −3 j^ - C) −6 i^ −3 j^ - D) 6 i^ +3 j^ **Answer:** A) −6 i^ +3 j^ **Explanation:** Multiply each component by −3: \\(2(-3)=-6\\) for i^ , \\((-1)(-3)=+3\\) for j^ . --- Feel free to use these questions directly for a printed paper or an online quiz. When you’re ready, click the action card below to generate a **customizable PDF** :::action:quiz?subject=Physics&chapter=Vector&count=10&solutions=true:::
`;

// test with the function
const { parseUniversalMCQs } = require('./test_universal_parser.js');
// let's re-define function in script to test directly
function parseUniversal(text) {
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

  mainContent = mainContent
    .replace(/:::action:[^:]*:::/gi, '')
    .replace(/(?:Feel free to use these questions|When you['’]re ready|click the action card|generate a \*\*customizable PDF\*\*|Best of luck)[\s\S]*$/i, '')
    .trim();

  let rawBlocks = mainContent.split(/(?:^|\n|---)\s*(?=(?:#{1,4}\s*)?(?:\*{0,2}(?:Question|Problem|Q\.?)\s*\d+(?:[\.\:\)]|\b)|\*{1,2}\d+[\.\:\)]\*{1,2}|\bQ\d+\b|\b\d+[\.\)]\s+))/i);

  if (rawBlocks.length <= 1) {
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

    const prefixMatch = trimmed.match(/^(?:#{1,4}\s*)?(?:\*{0,2}(?:Question|Problem|Q\.?)?\s*(\d+)(?:[\.\:\)]|\b)\*{0,2}\s*)/i);
    let qNumber = questionCounter;
    if (prefixMatch) {
      qNumber = parseInt(prefixMatch[1], 10) || questionCounter;
      trimmed = trimmed.slice(prefixMatch[0].length).trim();
    }

    let explanation = '';
    const expMatch = trimmed.match(/\*{0,2}(?:Explanation|Solution)[\s\:\*\-]+([\s\S]*?)(?:$|---)/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
      trimmed = trimmed.slice(0, expMatch.index).trim();
    }

    let rawAnswer = '';
    const ansMatch = trimmed.match(/\*{0,2}(?:Answer|Correct(?:\s+Option)?|Ans)[\s\:\*\-]+(?:Option\s*)?\(?([A-Ea-e])\)?(?:\s*\)\s*([^\n\-*]+))?/i);
    if (ansMatch) {
      rawAnswer = ansMatch[1].toUpperCase();
      trimmed = trimmed.slice(0, ansMatch.index).trim();
    } else if (answerKeyMap.has(qNumber)) {
      rawAnswer = answerKeyMap.get(qNumber);
    }

    const optLetters = ['A', 'B', 'C', 'D'];
    const optIndices = [];
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
    const options = [];

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

const all10 = parseUniversal(testUserText);
console.log('Total Parsed from 10 questions:', all10.length);
all10.forEach((q, i) => {
  console.log(`Q${i+1}: ${q.question.slice(0, 30)}... | ${q.options.length} options: [${q.options.map(o => o.slice(0, 15)).join(', ')}] | Ans: ${q.answer}`);
});
