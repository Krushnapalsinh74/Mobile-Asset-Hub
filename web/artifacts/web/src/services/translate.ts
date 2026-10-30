export interface Language {
  code: string;
  name: string;
  native: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
];

function splitIntoChunks(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let current = '';
  const parts = text.split(/(?<=[.!?\n])\s+/);

  for (const part of parts) {
    const candidate = current ? current + ' ' + part : part;
    if (candidate.length <= maxLen) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      if (part.length > maxLen) {
        for (let i = 0; i < part.length; i += maxLen) {
          chunks.push(part.slice(i, i + maxLen));
        }
        current = '';
      } else {
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(text: string, targetLang: string): Promise<string> {
  // Using a free translation endpoint for demonstration (MyMemory)
  // In production, this should point to a secure backend endpoint hitting Google Translate / AWS Translate
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText ?? text;
    return translated;
  } catch (err) {
    console.error("Translation chunk failed:", err);
    return text;
  }
}

export async function translateText(
  text: string,
  targetLang: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  if (!text || targetLang === 'en') return text;

  // We split into chunks of ~450 chars because free APIs have strict length limits
  const chunks = splitIntoChunks(text, 450);
  const results: string[] = new Array(chunks.length);

  const BATCH = 3;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const translated = await Promise.all(batch.map((c) => translateChunk(c, targetLang)));
    translated.forEach((t, j) => { results[i + j] = t; });
    onProgress?.(Math.min(100, Math.round(((i + BATCH) / chunks.length) * 100)));
    // Add delay between batches to respect rate limits
    if (i + BATCH < chunks.length) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return results.join(' ');
}
