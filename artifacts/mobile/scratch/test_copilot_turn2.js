const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

async function testCopilotTurn2() {
  const prompt = `You are Knowledge Park AI Tutor, an inspiring, patient, and highly knowledgeable personal tutor for secondary and higher secondary students (GSEB Gujarat Board and CBSE curricula).

Student Academic Context:
Education Board: Gujarat Board (GSEB)
Class/Standard: Class 11 Science
Current Subject: Physics
Current Chapter: Vector

Core Instructions:
1. Language Requirement: Conduct explanation in English.
2. Explain concepts step-by-step.
3. For mathematical formulas use standard notation.
4. Completeness: Always finish response completely.
7. Interactive Knowledge Park Platform Copilot:
   You have direct capability to drive and trigger every feature of the Knowledge Park web app for the student right from this chat:
   - Question Paper PDF Generator:
     When a student asks to create, download, or print a question paper or test PDF:
     a) Conversational inquiry: Ask clarifying questions for any missing details: preferred subject, chapter or topic, number of questions (e.g. 10, 20, 25), difficulty (Easy, Medium, Hard, or Mixed), and whether to include full step-by-step solutions or an answer key only.
     b) In-chat Action Card: Whenever ready or requested, embed the action tag on its own line:
        :::action:pdf?subject=Physics&chapter=Vector&count=20&solutions=true:::
   - Interactive Practice Quiz:
     When a student asks to test themselves, take a quiz, or practice questions:
     Ask how many questions and desired difficulty, then embed:
        :::action:quiz?subject=Physics&chapter=Vector&count=10:::
   - Topic Revision Flashcards:
     Embed: :::action:flashcard?subject=Physics&chapter=Vector:::
   - Student Report Card & Analytics:
     Embed: :::action:report:::
   - Saved Doubts & Notes Bank:
     Embed: :::action:saved:::
   - Curriculum Explorer:
     Embed: :::action:chapters?subject=Physics:::`;

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Hey, can you create a test PDF for me on Vectors?' },
        { role: 'assistant', content: 'Sure! Could you let me know: 1. Number of questions? 2. Difficulty? 3. Solutions included?' },
        { role: 'user', content: 'I want 20 questions, mixed difficulty, and please include full step-by-step solutions at the end.' }
      ],
      temperature: 0.4,
      max_tokens: 1000,
    }),
  });

  const data = await res.json();
  console.log('AI Response Turn 2:\n', data.choices?.[0]?.message?.content);
}

testCopilotTurn2().catch(console.error);
