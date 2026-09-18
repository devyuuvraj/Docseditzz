const STOP_WORDS = new Set([
  'about', 'after', 'also', 'been', 'before', 'being', 'between', 'could', 'each', 'from',
  'have', 'into', 'more', 'other', 'shall', 'should', 'such', 'than', 'that', 'their',
  'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'very',
  'were', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your',
]);

const sentences = (text) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

const wordFreq = (text) => {
  const freq = new Map();
  for (const word of text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []) {
    if (STOP_WORDS.has(word)) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
};

const scoreSentence = (sentence, freq) => {
  const tokens = sentence.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  if (!tokens.length) return 0;
  const total = tokens.reduce((sum, token) => sum + (freq.get(token) || 0), 0);
  return total / Math.sqrt(sentence.length);
};

const rankedSentences = (text, limit = 12) => {
  const freq = wordFreq(text);
  return sentences(text)
    .map((sentence, index) => ({ sentence, index, score: scoreSentence(sentence, freq) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map(({ sentence }) => sentence);
};

export const fallbackSummarize = (text, mode = 'medium') => {
  const picks = rankedSentences(text, mode === 'detailed' || mode === 'chapters' ? 12 : 8);
  if (!picks.length) return 'Not enough readable text was found in this document.';

  switch (mode) {
    case 'short':
      return picks.slice(0, 2).join(' ');
    case 'bullets':
      return picks.slice(0, 10).map((s) => `- ${s}`).join('\n');
    case 'chapters':
      return picks
        .slice(0, 6)
        .map((s, i) => `## Section ${i + 1}\n\n${s}`)
        .join('\n\n');
    case 'detailed':
      return picks.join('\n\n');
    default:
      return picks.slice(0, 5).join('\n\n');
  }
};

export const fallbackInsights = (text) => {
  const freq = wordFreq(text);
  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);

  const dates = [...text.matchAll(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/gi)]
    .slice(0, 8)
    .map((match) => ({ date: match[0], context: text.slice(Math.max(0, match.index - 40), match.index + 40).trim() }));

  const numbers = [...text.matchAll(/\b(?:\$|₹|€|£)?\d[\d,]*(?:\.\d+)?(?:%|k|m|b)?\b/gi)]
    .slice(0, 8)
    .map((match) => ({ value: match[0], context: text.slice(Math.max(0, match.index - 40), match.index + 40).trim() }));

  const people = [...text.matchAll(/\b[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}\b/g)]
    .slice(0, 8)
    .map((match) => ({ name: match[0], role: 'Mentioned in document' }));

  return { keywords, dates, numbers, people };
};

export const fallbackFlashcards = (text, count = 10) => {
  const picks = rankedSentences(text, count);
  return picks.map((sentence, index) => ({
    front: `What is the main point of excerpt ${index + 1}?`,
    back: sentence,
  }));
};

export const fallbackQuiz = (text, count = 8) => {
  const picks = rankedSentences(text, count);
  return picks.map((sentence, index) => ({
    question: `Which statement best matches excerpt ${index + 1}?`,
    options: [sentence, 'This statement is not supported by the document.', 'The document does not discuss this topic.', 'None of the above'],
    answerIndex: 0,
    explanation: 'This answer was generated locally from the uploaded document text.',
  }));
};

export const fallbackTransform = (text, action) => {
  const trimmed = text.trim();
  if (action === 'grammar') return trimmed.replace(/\s{2,}/g, ' ');
  if (action === 'simplify') return rankedSentences(trimmed, 2).join(' ') || trimmed;
  if (action === 'expand') return `${trimmed}\n\n${rankedSentences(trimmed, 2).join(' ')}`.trim();
  return trimmed;
};

export const fallbackChat = (documentText, question) => {
  const chunks = rankedSentences(documentText, 6);
  const q = question.toLowerCase();
  const match = chunks.find((chunk) => chunk.toLowerCase().includes(q.split(' ')[0])) || chunks[0];
  if (!match) return 'I could not find enough text in this document to answer that question.';
  return `Based on the document:\n\n${match}`;
};

export const FALLBACK_NOTICE =
  'OpenAI credits are unavailable, so this result was generated locally. Add billing at https://platform.openai.com/settings/organization/billing for full AI quality.';
