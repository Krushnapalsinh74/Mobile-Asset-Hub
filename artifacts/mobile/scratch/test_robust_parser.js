const rawText = `Q1. Two vectors A = 3i + 4j and B = 5i - 2j are added. What is the resultant vector R = A + B ? - A) 8i + 2j - B) 8i + 6j - C) -2i + 6j - D) 2i + 6j **Answer:** A) 8i + 2j **Explanation:** Add components: 3+5=8 (i-component), \\(4+(-2)=2\\) (j-component). ---

Q2. The magnitude of vector C = 6i - 8j is: - A) 10 - B) 14 - C) 2 - D) 12 **Answer:** A) 10 **Explanation:** \\(|\\vec{C}|=\\sqrt{6^{2}+(-8)^{2}}=\\sqrt{36+64}= \\sqrt{100}=10\\). ---

Q3. If P = 4i + 3j and Q = -4i + 3j, the angle between P and Q is: - A) 0° - B) 90° - C) 180° - D) 60° **Answer:** B) 90° **Explanation:** \\(\\vec{P}\\cdot\\vec{Q}=4(-4)+3(3)= -16+9 = -7\\). ---

Q10. The vector \\(\\vec{M}= (2\\hat{i} - \\hat{j})\\) is multiplied by a scalar -3. What is the resulting vector? - A) -6i + 3j - B) 6i - 3j - C) -6i - 3j - D) 6i + 3j **Answer:** A) -6i + 3j **Explanation:** Multiply each component by -3: \\(2(-3)=-6\\) for i, \\((-1)(-3)=+3\\) for j. --- Feel free to use these questions directly for a printed paper or an online quiz. When you’re ready, click the action card below to generate a **customizable PDF** :::action:quiz?subject=Physics&chapter=Vector&count=10&solutions=true:::`;

function parseQuestionsRobust(text) {
  if (!text) return [];
  const questions = [];

  // 1. Strip trailing conversational sign-off and action tags from the end of text
  let cleanedText = text
    .replace(/:::action:[^:]*:::/gi, '')
    .replace(/(?:Feel free to use these questions|When you['’]re ready|click the action card|generate a \*\*customizable PDF\*\*|Best of luck)[\s\S]*$/i, '')
    .trim();

  // 2. Split questions by Q1 / Question 1 / 1. or separator ---
  // A question block can start with: Q1 / Question 1 / 1. or follow '---'
  const blocks = cleanedText.split(/(?:^|\n|---)\s*(?=(?:#{1,4}\s*)?(?:\*{0,2}(?:Question|Problem|Q\.?)\s*\d+[\.\:\)]\*{0,2}|\*{1,2}\d+[\.\:\)]\*{1,2}|\bQ\d+[\.\:\s]|\b\d+[\.\)]\s+))/i);

  for (const block of blocks) {
    let trimmed = block.trim();
    if (!trimmed) continue;
    // Remove leading horizontal rules
    trimmed = trimmed.replace(/^(?:---|___|\*\*\*)\s*/, '').trim();

    // Must start with question header
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

    // Extract Options:
    // Support formats:
    // 1) - A) text - B) text ...
    // 2) A) text \n B) text ...
    // 3) (A) text (B) text ...
    // 4) A. text \n B. text ...
    const optRegex = /(?:^|\n|[-–—\s])(?:\*{0,2}\(?([A-Ea-e])\)?[\.\)\:]\*{0,2}|\(([A-Ea-e])\))\s*([^\n\-–—*]+?)(?=(?:[-–—\s]*(?:\*{0,2}\(?[A-Ea-e]\)?[\.\)\:]\*{0,2}|\([A-Ea-e]\))\s)|$)/g;
    
    // Find where the options section begins
    const firstOptMatch = body.match(/(?:^|\n|[-–—\s])(?:\*{0,2}\(?([A-Ea-e])\)?[\.\)\:]\*{0,2}|\(([A-Ea-e])\))\s*/);
    let prompt = body;
    const options = [];

    if (firstOptMatch && firstOptMatch.index !== undefined) {
      prompt = body.slice(0, firstOptMatch.index).trim();
      const optionsText = body.slice(firstOptMatch.index);
      
      const matches = [...optionsText.matchAll(optRegex)];
      for (const m of matches) {
        const letter = (m[1] || m[2]).toUpperCase();
        const textVal = m[3].replace(/^\*{1,2}|\*{1,2}$/g, '').trim();
        if (textVal) {
          options.push(textVal);
        }
      }
    }

    // If options were not captured or fewer than 2, try line-by-line fallback
    if (options.length < 2) {
      const lineOpts = [...body.matchAll(/(?:^|\n)\s*[-•*]?\s*(?:\(?([A-Ea-e])\)?[.:\-]\s*|\(([A-Ea-e])\)\s*)([^\n]+)/g)];
      if (lineOpts.length >= 2) {
        options.length = 0;
        for (const m of lineOpts) {
          options.push(m[3].trim());
        }
      }
    }

    // Format Answer
    let finalAnswer = rawAnswer;
    if (rawAnswer) {
      const idx = rawAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
      if (options[idx]) {
        finalAnswer = `(${rawAnswer}) ${options[idx]}`;
      }
    } else if (options.length > 0) {
      finalAnswer = options[0];
    }

    // Clean prompt
    prompt = prompt.replace(/^\*{1,2}|\*{1,2}$/g, '').replace(/^-+\s*/, '').trim();

    if (prompt) {
      questions.push({
        question: prompt,
        options: options.length >= 2 ? options : ['A', 'B', 'C', 'D'],
        answer: finalAnswer,
        solution: explanation,
        explanation,
      });
    }
  }

  return questions;
}

const parsed = parseQuestionsRobust(rawText);
console.log('Parsed count:', parsed.length);
parsed.forEach((q, i) => {
  console.log(`\n--- Q${i+1} ---`);
  console.log('Prompt:', q.question);
  console.log('Options:', q.options);
  console.log('Answer:', q.answer);
  console.log('Explanation:', q.solution);
});
