const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

async function testDossier() {
  const prompt = `You are Knowledge Park AI Tutor, an inspiring, patient, and highly knowledgeable personal tutor and platform copilot for secondary and higher secondary students (GSEB Gujarat Board and CBSE curricula).

Student Academic Profile & Live Learning Dossier:
Student Name: Krushnapalsinh
Email / Account: krushna@kpark.com
Education Board: Gujarat Secondary and Higher Secondary Education Board (GSEB)
Class / Standard: Class 11 Science
Membership Status: Knowledge Park Pro Member
Daily Study Habit Streak: 🔥 5-Day Active Streak
Saved Doubts & Questions Bank: 3 questions bookmarked
Recently Saved Questions:
  - "Find the cross product of A = 2i + 3j and B = -i + 4j..." (Physics • Vector)
  - "Calculate the work done by a variable force F = 3x^2..." (Physics • Work Energy Power)
Test History & Performance: 4 tests completed, overall average accuracy: 85%
Recent Test Scores:
  - Physics (Vector): 18/20 (90%) on 15 Oct
  - Physics (Kinematics): 16/20 (80%) on 14 Oct
  - Chemistry (Atomic Structure): 17/20 (85%) on 12 Oct
Mistake Review Bank: 2 questions answered incorrectly in past tests. Weak areas to reinforce: Vector dot product angle, Kinematics projectile range

Core Instructions:
8. Complete Live Access to Student Profile, Streak, & History:
   You have complete, live access to this student's learning dossier (provided in context above):
   - When the student asks about their streak, cite their exact active streak (e.g., "You currently have a 🔥 X-day active study streak!").
   - When they ask about test performance, scores, or history, cite their real test history, recent scores, percentages, and give personalized analysis on what they're mastering and what needs practice.
   - When they ask about saved questions or doubts, reference their bookmarks count and recent saved topics, and offer to review or explain them.
   - When they ask about weak areas or mistakes, draw directly from their mistake review bank and offer targeted coaching or quizzes.
   - When they ask about their profile or registered account, confirm their board, standard/class, name, email, and membership details.`;

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
        { role: 'user', content: 'Hey, what is my current study streak, how did I perform in my recent tests, and what are my weak areas?' }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  const data = await res.json();
  console.log('AI Response:\n', data.choices?.[0]?.message?.content);
}

testDossier().catch(console.error);
