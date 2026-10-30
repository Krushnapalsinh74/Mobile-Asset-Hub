const userGeneratedText = `
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

function parseQuestionsFromTextEnhanced(text) {
  if (!text) return [];
  const questions = [];

  // 1. Strip trailing conversational sign-off and action tags
  const cleanedText = text
    .replace(/:::action:[^:]*:::/gi, '')
    .replace(/(?:Feel free to use these questions|When you['’]re ready|click the action card|generate a \*\*customizable PDF\*\*|Best of luck)[\s\S]*$/i, '')
    .trim();

  // 2. Split questions by Q1 / Question 1 / 1. or separator ---
  const qBlocks = cleanedText.split(/(?:^|\n|---)\s*(?=(?:#{1,4}\s*)?(?:\*{0,2}(?:Question|Problem|Q\.?)\s*\d+[\.\:\)]\*{0,2}|\*{1,2}\d+[\.\:\)]\*{1,2}|\bQ\d+[\.\:\s]|\b\d+[\.\)]\s+))/i);

  for (const block of qBlocks) {
    let trimmed = block.trim();
    if (!trimmed) continue;
    trimmed = trimmed.replace(/^(?:---|___|\*\*\*)\s*/, '').trim();

    // Must start with question indicator
    const headMatch = trimmed.match(/^(?:#{1,4}\s*)?(?:\*{0,2}(?:Question|Problem|Q\.?)?\s*(\d+)[\.\:\)]\*{0,2}\s*)([\s\S]+)/i);
    if (!headMatch) continue;

    let body = headMatch[2].trim();

    // Extract Explanation
    let explanation = '';
    const expMatch = body.match(/\*{0,2}(?:Explanation|Solution)[\s\:\*\-]+([\s\S]*?)(?:$|---)/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
      body = body.slice(0, expMatch.index).trim();
    }

    // Extract Answer
    let rawAnswer = '';
    const ansMatch = body.match(/\*{0,2}(?:Answer|Correct(?:\s+Option)?|Ans)[\s\:\*\-]+(?:Option\s*)?\(?([A-Ea-e])\)?(?:\s*\)\s*([^\n\-*]+))?/i);
    if (ansMatch) {
      rawAnswer = ansMatch[1].toUpperCase();
      body = body.slice(0, ansMatch.index).trim();
    }

    // Now find Option A, B, C, D
    const optLetters = ['A', 'B', 'C', 'D'];
    const optIndices = [];

    let searchFrom = 0;
    for (const letter of optLetters) {
      const pat = new RegExp(`(?:^|\\n|\\s+[-•*]?\\s*)(?:\\*\\*)?(?:\\(${letter}\\)|${letter}[\\.\\)])(?:\\*\\*)?\\s*`, 'i');
      const subStr = body.slice(searchFrom);
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

    let prompt = body;
    const options = [];

    if (optIndices.length >= 2) {
      prompt = body.slice(0, optIndices[0].start).trim();
      for (let i = 0; i < optIndices.length; i++) {
        const start = optIndices[i].contentStart;
        const end = i + 1 < optIndices.length ? optIndices[i + 1].start : body.length;
        let optVal = body.slice(start, end).trim();
        optVal = optVal.replace(/\s+[-–—]$/, '').trim();
        options.push(optVal);
      }
    } else {
      // Fallback for options on separate lines
      const lineOpts = [...body.matchAll(/(?:^|\n)\s*[-•*]?\s*(?:\(?([A-Ea-e])\)?[.:\-]\s*|\(([A-Ea-e])\)\s*)([^\n]+)/g)];
      if (lineOpts.length >= 2) {
        options.length = 0;
        for (const m of lineOpts) {
          options.push(m[3].trim());
        }
      }
    }

    // Clean prompt
    prompt = prompt.replace(/\s*[-–—:]\s*$/, '').replace(/^\*{1,2}|\*{1,2}$/g, '').trim();

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

    if (prompt) {
      questions.push({
        question: prompt,
        options: options.length >= 2 ? options : ['A', 'B', 'C', 'D'],
        answer: finalAnswer || 'A',
        solution: explanation,
        explanation,
      });
    }
  }

  return questions;
}

const parsedAll = parseQuestionsFromTextEnhanced(userGeneratedText);
console.log('Total Parsed:', parsedAll.length);
parsedAll.forEach((q, i) => {
  console.log(`Q${i+1}: ${q.question.slice(0, 35)}... | Opts (${q.options.length}): [${q.options.join(', ')}] | Ans: ${q.answer} | Expl len: ${q.explanation.length}`);
});
