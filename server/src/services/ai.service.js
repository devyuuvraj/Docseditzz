import OpenAI from 'openai';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { chunkText, topChunksFor } from './text.service.js';

let client = null;
const getClient = () => {
  if (!config.openai.apiKey) {
    throw ApiError.server('AI features are not configured (missing OPENAI_API_KEY)');
  }
  if (!client) client = new OpenAI({ apiKey: config.openai.apiKey });
  return client;
};

const complete = async (system, user, { json = false, maxTokens = 1600 } = {}) => {
  try {
    const res = await getClient().chat.completions.create({
      model: config.openai.model,
      max_tokens: maxTokens,
      temperature: 0.4,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    if (err.status === 429) throw new ApiError(429, 'AI rate limit reached. Try again shortly.');
    throw ApiError.server('AI request failed: ' + (err.message || 'unknown error'));
  }
};

const clip = (text, max = 24000) => (text.length > max ? text.slice(0, max) + '\n…[truncated]' : text);

/* ---------------------------------- Summaries ---------------------------------- */

const SUMMARY_PROMPTS = {
  short: 'Write a crisp 2-3 sentence summary.',
  medium: 'Write a well-structured summary of 2-3 paragraphs.',
  detailed:
    'Write a detailed, comprehensive summary with sections and sub-points. Cover all major topics.',
  bullets: 'Summarize as 8-15 concise markdown bullet points grouped under bold topic headers.',
  chapters:
    'Split the document into logical chapters/sections. For each, give a bold heading and a short paragraph summary in reading order.',
};

export const summarize = async (text, mode = 'medium') => {
  const instruction = SUMMARY_PROMPTS[mode] || SUMMARY_PROMPTS.medium;
  return complete(
    `You are an expert document analyst. ${instruction} Respond in markdown. Use the same language as the document.`,
    clip(text),
    { maxTokens: mode === 'detailed' || mode === 'chapters' ? 2400 : 1000 }
  );
};

export const extractInsights = async (text) => {
  const raw = await complete(
    `Extract structured insights from the document. Respond with a JSON object with keys:
"keywords" (array of up to 15 important keywords/phrases),
"dates" (array of {date, context}),
"numbers" (array of {value, context} for significant figures, amounts, statistics),
"people" (array of {name, role} for people and organizations mentioned).
Only include items actually present in the text.`,
    clip(text),
    { json: true }
  );
  try {
    return JSON.parse(raw);
  } catch {
    throw ApiError.server('AI returned an unexpected format. Please retry.');
  }
};

export const generateFlashcards = async (text, count = 10) => {
  const raw = await complete(
    `Create ${count} study flashcards from the document. Respond with JSON: {"flashcards":[{"front":"question or term","back":"answer or definition"}]}. Make them varied and test real understanding.`,
    clip(text),
    { json: true, maxTokens: 2000 }
  );
  try {
    return JSON.parse(raw).flashcards || [];
  } catch {
    throw ApiError.server('AI returned an unexpected format. Please retry.');
  }
};

export const generateQuiz = async (text, count = 8) => {
  const raw = await complete(
    `Create a ${count}-question multiple-choice quiz from the document. Respond with JSON:
{"questions":[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]}.
Exactly 4 options each. Vary the difficulty.`,
    clip(text),
    { json: true, maxTokens: 2400 }
  );
  try {
    return JSON.parse(raw).questions || [];
  } catch {
    throw ApiError.server('AI returned an unexpected format. Please retry.');
  }
};

/* ---------------------------------- Text transforms ---------------------------------- */

const TRANSFORM_PROMPTS = {
  explain: 'Explain the following text clearly and simply, as if to a smart student. Use examples where helpful.',
  rewrite: 'Rewrite the following text to be clearer and better written while preserving its full meaning.',
  grammar: 'Correct all grammar, spelling and punctuation errors. Return only the corrected text.',
  simplify: 'Simplify the following text so a general audience can easily understand it.',
  expand: 'Expand the following text with more detail, nuance and supporting explanation.',
  professional: 'Rewrite the following text in a polished, professional business tone.',
  academic: 'Rewrite the following text in a formal academic tone with precise language.',
  legal: 'Rewrite the following text in a precise legal register, careful and unambiguous.',
  medical: 'Rewrite the following text using accurate clinical/medical phrasing.',
};

export const transformText = async (text, action, { language } = {}) => {
  if (action === 'translate') {
    if (!language) throw ApiError.badRequest('Target language is required for translation');
    return complete(
      `Translate the user's text into ${language}. Preserve tone, formatting and meaning. Return only the translation.`,
      clip(text, 12000)
    );
  }
  const prompt = TRANSFORM_PROMPTS[action];
  if (!prompt) throw ApiError.badRequest(`Unknown AI action: ${action}`);
  return complete(`${prompt} Return only the resulting text in markdown.`, clip(text, 12000));
};

/* ---------------------------------- Chat with PDF ---------------------------------- */

export const chatWithDocument = async (documentText, question, history = []) => {
  const chunks = chunkText(documentText);
  const context = topChunksFor(question, chunks, 5).join('\n---\n');
  const messages = [
    {
      role: 'system',
      content: `You are DOCSEDITZ AI, an assistant that answers questions about the user's document.
Base your answers strictly on the provided document excerpts. If the answer is not in the document, say so honestly.
Document excerpts:\n"""${clip(context, 14000)}"""`,
    },
    ...history.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content).slice(0, 2000) })),
    { role: 'user', content: question },
  ];

  try {
    const res = await getClient().chat.completions.create({
      model: config.openai.model,
      max_tokens: 1200,
      temperature: 0.3,
      messages,
    });
    return res.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    if (err.status === 429) throw new ApiError(429, 'AI rate limit reached. Try again shortly.');
    throw ApiError.server('AI request failed: ' + (err.message || 'unknown error'));
  }
};
