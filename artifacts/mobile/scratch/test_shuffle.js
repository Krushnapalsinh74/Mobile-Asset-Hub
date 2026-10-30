function shuffleQuestionOptions(q, targetIndex) {
  if (!q.options || q.options.length < 2) return q;

  // Clean option prefix if it was baked in (e.g. "A) 8i + 2j" -> "8i + 2j")
  const cleanOptions = q.options.map(opt => opt.replace(/^[A-Ea-e][\.\)]\s*/, '').trim());

  // Determine which option is the correct one
  let origIdx = -1;
  const ansMatch = (q.answer || '').match(/^[(\[]?([A-Ea-e])[)\]]?/);
  if (ansMatch) {
    origIdx = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
  }
  if (origIdx < 0 || origIdx >= cleanOptions.length) {
    // Try matching text
    origIdx = cleanOptions.findIndex(opt => (q.answer || '').toLowerCase().includes(opt.toLowerCase()));
  }
  if (origIdx < 0 || origIdx >= cleanOptions.length) {
    origIdx = 0;
  }

  const correctText = cleanOptions[origIdx];

  // We can either shuffle randomly or place at targetIndex (to guarantee uniform A, B, C, D distribution)
  let shuffled = [...cleanOptions];
  if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < cleanOptions.length) {
    // Move correctText to targetIndex
    shuffled.splice(origIdx, 1);
    // Fisher-Yates shuffle the distractors
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Insert correctText at targetIndex
    shuffled.splice(targetIndex, 0, correctText);
  } else {
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }

  const newIdx = shuffled.indexOf(correctText);
  const origLetter = String.fromCharCode(65 + origIdx);
  const newLetter = String.fromCharCode(65 + newIdx);

  const newAnswer = `(${newLetter}) ${correctText}`;

  // Update explanation if it mentions old letter
  let newExpl = q.explanation || q.solution || '';
  if (newExpl && origLetter !== newLetter) {
    newExpl = newExpl
      .replace(new RegExp(`\\bOption\\s+${origLetter}\\b`, 'gi'), `Option ${newLetter}`)
      .replace(new RegExp(`\\(${origLetter}\\)`, 'g'), `(${newLetter})`)
      .replace(new RegExp(`\\b(?:answer|option)\\s+(?:is\\s+)?${origLetter}\\b`, 'gi'), `answer is ${newLetter}`);
  }

  return {
    ...q,
    options: shuffled,
    answer: newAnswer,
    explanation: newExpl,
    solution: newExpl,
  };
}

const sampleQuestions = [
  { question: 'Q1', options: ['A) 8i+2j', 'B) 8i+6j', 'C) -2i+6j', 'D) 2i+6j'], answer: '(A) 8i+2j', explanation: 'Add components: Option A is correct.' },
  { question: 'Q2', options: ['A) 10', 'B) 14', 'C) 2', 'D) 12'], answer: '(A) 10', explanation: 'Magnitude is 10. Option A.' },
  { question: 'Q3', options: ['A) 0', 'B) 90', 'C) 180', 'D) 45'], answer: '(A) 0', explanation: 'Angle is 0.' },
  { question: 'Q4', options: ['A) -1/sqrt(2) i', 'B) 1/sqrt(2) i', 'C) -1/2 i', 'D) 1/2 i'], answer: '(A) -1/sqrt(2) i', explanation: 'Option A is unit vector.' },
  { question: 'Q5', options: ['A) 15 N', 'B) 10 N', 'C) 5 N', 'D) 25 N'], answer: '(A) 15 N', explanation: 'Resultant is 15 N.' },
  { question: 'Q6', options: ['A) 1', 'B) 0', 'C) -1', 'D) 2'], answer: '(A) 1', explanation: 'Dot product is 1.' },
  { question: 'Q7', options: ['A) perpendicular', 'B) parallel', 'C) collinear', 'D) null'], answer: '(A) perpendicular', explanation: 'Vectors are perpendicular.' },
  { question: 'Q8', options: ['A) 50', 'B) 25', 'C) 100', 'D) 0'], answer: '(A) 50', explanation: 'Work done is 50.' },
  { question: 'Q9', options: ['A) scalar', 'B) vector', 'C) tensor', 'D) matrix'], answer: '(A) scalar', explanation: 'Dot product is scalar.' },
  { question: 'Q10', options: ['A) -6i+3j', 'B) 6i-3j', 'C) -6i-3j', 'D) 6i+3j'], answer: '(A) -6i+3j', explanation: 'Multiplied by -3 gives Option A.' },
];

console.log('--- BEFORE SHUFFLE (All answers A) ---');
console.log(sampleQuestions.map(q => q.answer.slice(0, 3)));

console.log('\n--- AFTER UNIFORM DISTRIBUTION SHUFFLE ---');
const letters = [0, 1, 2, 3]; // A, B, C, D
// Shuffle pattern so answers are balanced across A, B, C, D
const targetDistribution = [0, 1, 2, 3, 1, 2, 0, 3, 2, 1]; // or pseudo-random
const shuffledAll = sampleQuestions.map((q, idx) => {
  const target = targetDistribution[idx % targetDistribution.length];
  return shuffleQuestionOptions(q, target);
});

shuffledAll.forEach((q, i) => {
  console.log(`Q${i+1}: Answer=${q.answer.slice(0, 3)}, Options=[${q.options.join(', ')}]`);
  console.log(`     Expl=${q.explanation}`);
});
