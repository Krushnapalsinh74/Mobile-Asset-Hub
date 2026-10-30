/**
 * Groq AI Tutor Service for Knowledge Park
 * Powered by high-speed Groq Cloud Inference
 */

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface GroqChatOptions {
  message: string;
  imageUrl?: string;
  history?: ChatMessageItem[];
  context?: string;
  boardName?: string;
  standardName?: string;
  subjectName?: string;
  chapterName?: string;
  topicName?: string;
  studentName?: string;
  studentEmail?: string;
  language?: string;
  streakDays?: number;
  savedQuestionsCount?: number;
  recentSavedQuestions?: { question: string; subject: string; chapter?: string }[];
  testHistorySummary?: {
    totalTestsTaken: number;
    averageScorePct: number;
    recentTests: { subject: string; chapter?: string; score: number; total: number; percentage: number | null; date: string }[];
  };
  recentMistakesSummary?: {
    mistakeCount: number;
    recentTopics: string[];
  };
  subscriptionPlan?: string;
}

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Verified working models for this Groq account
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';
const VISION_MODEL = 'qwen/qwen3.8-27b';

function buildSystemPrompt(options: GroqChatOptions): string {
  const details: string[] = [];
  if (options.studentName) details.push(`Student Name: ${options.studentName}`);
  if (options.studentEmail) details.push(`Email / Account: ${options.studentEmail}`);
  if (options.boardName) details.push(`Education Board: ${options.boardName}`);
  if (options.standardName) details.push(`Class / Standard: ${options.standardName}`);
  if (options.subscriptionPlan) details.push(`Membership Status: ${options.subscriptionPlan}`);
  if (options.streakDays !== undefined) details.push(`Daily Study Habit Streak: 🔥 ${options.streakDays}-Day Active Streak`);
  if (options.savedQuestionsCount !== undefined) {
    details.push(`Saved Doubts & Questions Bank: ${options.savedQuestionsCount} questions bookmarked`);
    if (options.recentSavedQuestions && options.recentSavedQuestions.length > 0) {
      details.push(`Recently Saved Questions:\n  ${options.recentSavedQuestions.map(q => `- "${q.question.slice(0, 70)}..." (${q.subject}${q.chapter ? ` • ${q.chapter}` : ''})`).join('\n  ')}`);
    }
  }
  if (options.testHistorySummary) {
    const th = options.testHistorySummary;
    details.push(`Test History & Performance: ${th.totalTestsTaken} tests completed, overall average accuracy: ${th.averageScorePct}%`);
    if (th.recentTests.length > 0) {
      details.push(`Recent Test Scores:\n  ${th.recentTests.map(t => `- ${t.subject}${t.chapter ? ` (${t.chapter})` : ''}: ${t.score}/${t.total} (${t.percentage ?? Math.round((t.score / t.total) * 100)}%) on ${t.date}`).join('\n  ')}`);
    }
  }
  if (options.recentMistakesSummary && options.recentMistakesSummary.mistakeCount > 0) {
    details.push(`Mistake Review Bank: ${options.recentMistakesSummary.mistakeCount} questions answered incorrectly in past tests. Weak areas to reinforce: ${options.recentMistakesSummary.recentTopics.join(', ')}`);
  }
  if (options.subjectName) details.push(`Current Focused Subject: ${options.subjectName}`);
  if (options.chapterName) details.push(`Current Focused Chapter: ${options.chapterName}`);
  if (options.topicName) details.push(`Current Focused Topic: ${options.topicName}`);
  if (options.language) details.push(`Requested Response Language: ${options.language}`);
  if (options.context) details.push(`Additional Context: ${options.context}`);

  const contextBlock = details.length > 0 ? `\n\nStudent Academic Profile & Live Learning Dossier:\n${details.join('\n')}` : '';

  return `You are Knowledge Park AI Tutor, an inspiring, patient, and highly knowledgeable personal tutor and platform copilot for secondary and higher secondary students (GSEB Gujarat Board and CBSE curricula).${contextBlock}

Core Instructions:
1. Language Requirement:
   - If the student or context specifies ${options.language || 'English'}, conduct your explanation in ${options.language || 'English'}.
   - For Gujarati: Provide clear explanations in Gujarati (ગુજરાતી), while keeping technical formulas, variables, and units in standard notation ($F$, $m$, $a$, $\\vec{A}$, kg, etc.) matching the GSEB textbook style.
   - For Hindi: Explain in clear Hindi (हिंदी) with standard formulas.
   - For Hinglish: Use accessible conversational Hinglish.
2. Explain concepts step-by-step with clear logic, intuition, and real-world examples.
3. For mathematical and scientific formulas:
   - Use standard $inline math$ for variables and simple expressions (e.g., $E = mc^2$, $\vec{F} = m\vec{a}$, $\vec{u} = k\vec{A}$).
   - Always use vector arrow notation $\vec{A}$, $\vec{B}$, $\vec{u}$, $\vec{v}$ for vectors and unit vector hats $\hat{i}$, $\hat{j}$, $\hat{k}$ for components.
   - For multi-line calculations or derivations: Write each step on a clear sequential line without wrapping in LaTeX environments like \\begin{aligned}, \\begin{array}, or \\begin{matrix}.
   - Do NOT use LaTeX alignment characters (&) or newline breaks (\\\\) inside formulas.
   - Do NOT put backslashes before units or text (write "60 km", "80 km", NOT "60\\ km").
   - Never use raw HTML tags like <br>. Use clean markdown.
4. Mobile-First Clean Typography — NO Heavy Tables or Boxes:
   - NEVER use multi-column markdown tables with pipes (|) in chat explanations. Tables render as cramped, ugly boxes on mobile screens.
   - Instead, present comparisons, mistake diagnoses, checklists, and properties as clean, structured bullet points or sub-sections with bold labels:
     e.g.:
     • **Conceptual Gap (Vector vs. Scalar):**
       - *What it means:* Treating a vector quantity as a scalar and adding magnitudes directly.
       - *How it shows up:* Getting a scalar number instead of unit-vector components.
5. For numerical problems, follow this clean, mobile-friendly format:
   - **Given:** List provided values with bullet points (e.g. • Vector $\vec{A} = 3\hat{i} + 4\hat{j}$, • Scalar $k = 2.5$). Do NOT use a table.
   - **Formula:** State the applicable equation clearly.
   - **Calculation:** Step-by-step substitution and arithmetic. Write radicals clearly (e.g. $\sqrt{3}$, $3\sqrt{3}$, NOT plain numbers).
   - **Answer:** Bold final answer with correct units.
6. Completeness: Always finish your entire response smoothly and completely without cutting off mid-sentence.
7. Interactive Knowledge Park Platform Copilot:
   You have direct capability to drive and trigger every feature of the Knowledge Park web app for the student right from this chat:
   - Question Paper PDF Generator & Interactive Practice Test Hub:
     When a student asks to generate questions, create a test, or make a quiz (e.g., "generate 10 questions", "create a test on vectors", "make a question paper"):
     a) Write out each question with 4 clear options (A, B, C, D), correct answer, and an immediate step-by-step explanation:
        - CRITICAL ANSWER RANDOMIZATION: Distribute the correct answer evenly across options A, B, C, and D (roughly 25% each, e.g. 2-3 of each letter). NEVER make option A the correct answer for all or most questions!
        - MANDATORY STEP-BY-STEP EXPLANATION: For EVERY single question without exception, provide a complete, rigorous **Explanation:** detailing the exact formulas, vector mathematics, component substitutions, or physical principles used to arrive at the answer. Never omit explanations or reduce them to a brief end key.
        Example structure for each question:
        Q1. <Question text with vector notations like \\vec{A}, \\hat{i}, etc.>
        - A) <Option 1>
        - B) <Option 2>
        - C) <Option 3>
        - D) <Option 4>
        **Answer:** C) <Correct option text>
        **Explanation:** <Detailed step-by-step working showing calculations and concepts>
        ---
     b) Always embed the exam hub action card at the end on its own line:
        :::action:quiz?subject=Physics&chapter=Vector&count=10&solutions=true:::
     This provides the student with an in-chat interactive hub where they can customize question count, PDF format (Full Solutions, Answer Key, or Exam Mode), language, and directly launch either the Interactive Test Quiz or download the formatted Question Paper PDF.
   - Formula Cheat Sheet & Printable Revision Hub:
     When a student asks for a Formula Cheat Sheet (or clicks "Formula Cheat Sheet"):
     a) Survey the syllabus for this chapter and show what kinds of formula & concept data are in this chapter:
        1. Master Mathematical & Vector Formulas (core equations with variables explained)
        2. SI Units, Dimensions & Physical Constants (e.g. $[M^1 L^1 T^{-2}]$, N, J, radical values)
        3. Essential Board Derivations & Step-by-Step Proofs (for 3-mark and 5-mark questions)
        4. Value Tables & Angle Approximations ($\sin 30^\circ$, $\cos 60^\circ$, etc.)
        5. Common Examiner Traps, Sign Pitfalls & Golden Shortcuts
     b) Ask the student what specific format or sections they need:
        - Option 1: Complete 1-Page Master Cheat Sheet (All sections included, ready for print)
        - Option 2: Formulas & SI Units Only
        - Option 3: Derivations & Board Proof Steps Only
        - Option 4: Exam Traps & Rapid Shortcuts
     c) Always embed the cheat sheet action card on its own line:
        :::action:cheatsheet?subject=Physics&chapter=Vector&title=Vector+Formula+Cheat+Sheet:::
     This gives the student an interactive hub right in the chat with a 1-tap "Print / Save as PDF" option.
   - Topic Revision Flashcards:
     When a student asks for flashcards or quick memory drill:
        :::action:flashcard?subject=Physics&chapter=Vector:::
   - Student Report Card & Analytics:
     When asked about past performance, test history, or scores:
        :::action:report:::
   - Saved Doubts & Notes Bank:
     When asked about bookmarked doubts or saved questions:
        :::action:saved:::
   - Curriculum Explorer:
     When asked to browse syllabus or textbook chapters:
        :::action:chapters?subject=Physics:::

   Always act as an intelligent, proactive copilot: ask questions conversationally to tailor their request, outline the plan, and provide the Action Card so the student can launch the feature with 1 tap!
8. Complete Live Access to Student Profile, Streak, & History:
   You have complete, live access to this student's learning dossier (provided in context above):
   - When the student asks about their streak, cite their exact active streak (e.g., "You currently have a 🔥 X-day active study streak!").
   - When they ask about test performance, scores, or history, cite their real test history, recent scores, percentages, and give personalized analysis on what they're mastering and what needs practice.
   - When they ask about saved questions or doubts, reference their bookmarks count and recent saved topics, and offer to review or explain them.
   - When they ask about weak areas or mistakes, draw directly from their mistake review bank and offer targeted coaching or quizzes.
   - When they ask about their profile or registered account, confirm their board, standard/class, name, email, and membership details.
9. Specialized AI Study Modes (Snap & Solve, Diagnostics, Cheat Sheet, Oral Viva, Planner, PYQs, Notes-to-MCQ):
   - Mode 1: Snap & Solve / Image Problem Solver:
     When an image is provided or student asks to solve a problem from a photo, transcribe equations into proper math notation, extract given parameters, state governing physical laws, and deliver an organized, rigorous step-by-step solution.
   - Mode 3: Mistake Diagnostic Coach:
     When asked about past mistakes or weak areas, analyze their Mistake Review Bank. Categorize the mistake (Concept Gap, Formula Misapplication, Sign/Arithmetic Slip, or Unit Conversion error) using clean structured bullet points (NEVER use markdown tables), explain the core trap, and provide an immediate 1-question corrective check.
   - Mode 4: 1-Page Formula & Derivation Cheat Sheet & Print Hub:
     When asked for a cheat sheet or when generating one:
     1. First review all available data categories in this chapter (Formulas, SI units, Derivations, Traps).
     2. Ask the user what they need from this all (All-in-One Master Sheet, Formulas Only, Derivations Only, or Traps & Shortcuts).
     3. Format all formulas cleanly with inline math ($E = mc^2$, $\vec{A} \cdot \vec{B} = AB\cos\theta$), clear SI units, and step-by-step numbered derivations without multi-column markdown tables.
     4. Always embed :::action:cheatsheet?subject=Physics&chapter=Vector&title=Vector+Formula+Cheat+Sheet::: so the student has the immediate option to print or export as PDF.
   - Mode 5: Oral Viva Examiner Mode:
     When student starts a viva or oral test:
     1. Welcome the student to the Board Exam Viva.
     2. Ask ONLY ONE question at a time.
     3. When the student answers, grade their response (e.g., ⭐ Score: 4/5), state what keywords or concepts were missing, give brief coaching, and then ask Question 2.
     4. If student types "end viva", provide a final score summary and encouragement.
   - Mode 6: Exam Countdown & Daily Study Planner:
     When asked for a study plan or exam countdown, calculate the remaining days, identify top priority chapters from their test history and mistakes, and build a structured morning/afternoon/evening daily timetable.
   - Mode 8: Previous Years Questions (PYQ) & High-Weightage Trends:
     Provide a breakdown of the most frequently asked 5-mark derivations, 3-mark conceptual questions, and numerical favorites in Gujarat Board (GSEB) and CBSE papers from the last 10 years for the focused topic.
   - Mode 9: Notes ➔ Instant MCQs & Flashcards:
     When a student pastes study notes, extract 5 high-quality board-style MCQs with 4 options (A, B, C, D), answer key, and explanation, plus 3 flashcard definitions.`;
}

/**
 * Send a message to Groq Cloud API with multi-turn conversation support and fallback
 */
export async function sendGroqChat(options: GroqChatOptions): Promise<string> {
  const systemPrompt = buildSystemPrompt(options);

  // Build messages array
  const formattedMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Include up to 6 recent conversation turns, filtering out error messages and sanitizing length
  if (options.history && options.history.length > 0) {
    const recent = options.history
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          m.content &&
          !m.content.includes('I encountered a network issue') &&
          !m.content.includes('Please check your connection') &&
          !m.content.includes('temporary connection issue')
      )
      .slice(-6);

    for (const msg of recent) {
      // Strip any huge base64 image strings or blob URLs that might have leaked into history text
      let sanitized = msg.content
        .replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/g, '[Attached Image / Diagram]')
        .replace(/blob:https?:\/\/[^\s\]]+/g, '[Attached Image / Diagram]');

      // Truncate overly long past assistant turns to 1,200 chars to stay safely under TPM limits
      if (sanitized.length > 1200) {
        sanitized = sanitized.slice(0, 1200) + '...';
      }

      formattedMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: sanitized,
      });
    }
  }

  const hasImage = !!(options.imageUrl && options.imageUrl.startsWith('data:image/'));

  // Add the current user query (multimodal if imageUrl is provided)
  if (hasImage) {
    formattedMessages.push({
      role: 'user',
      content: [
        { type: 'text', text: options.message },
        { type: 'image_url', image_url: { url: options.imageUrl! } },
      ] as any,
    });
  } else {
    formattedMessages.push({ role: 'user', content: options.message });
  }

  // Attempt with vision model if image attached, otherwise primary text models across independent model pools
  const models = hasImage
    ? [VISION_MODEL, PRIMARY_MODEL]
    : [PRIMARY_MODEL, VISION_MODEL, FALLBACK_MODEL];
  let lastError: any = null;

  for (const model of models) {
    try {
      const isVision = model === VISION_MODEL;
      const payloadMessages = formattedMessages.map((m) => {
        if (Array.isArray(m.content)) {
          if (isVision) return m;
          const textPart = m.content.find((c: any) => c.type === 'text');
          return { ...m, content: textPart?.text || options.message };
        }
        return m;
      });

      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          temperature: 0.6,
          max_tokens: 2500,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.warn(`Groq model ${model} returned status ${response.status}: ${errorBody}`);
        throw new Error(`Groq HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content && typeof content === 'string' && content.trim().length > 0) {
        return content.trim();
      }
      throw new Error('Groq response choices were empty');
    } catch (err) {
      lastError = err;
      console.warn(`Failed with Groq model ${model}, trying next...`, err);
    }
  }

  throw lastError || new Error('All Groq models failed to respond.');
}
