import OpenAI from 'openai';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { chunkText, topChunksFor } from './text.service.js';
import {
  fallbackSummarize,
  fallbackInsights,
  fallbackFlashcards,
  fallbackQuiz,
  fallbackTransform,
  fallbackChat,
  FALLBACK_NOTICE,
} from './ai.fallback.service.js';

let client = null;
let aiHealth = { checked: false, ok: false, reason: null };

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw ApiError.server(
      'AI features are not configured. Add GEMINI_API_KEY to server/.env and restart the backend.'
    );
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL:
        'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  }

  return client;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isQuotaError = (err) => {
  const code = err?.code || err?.error?.code;
  const type = err?.error?.type || err?.type;
  const message = String(
    err?.message || err?.error?.message || ''
  ).toLowerCase();

  return (
    type === 'insufficient_quota' ||
    code === 'insufficient_quota' ||
    code === 'credit_balance_exhausted' ||
    code === 'quota_exceeded' ||
    type === 'quota_exceeded' ||
    message.includes('quota exceeded') ||
    message.includes('resource exhausted') ||
    message.includes('no credits remaining')
  );
};

export const getAiHealth = () => aiHealth;

export const checkAiHealth = async () => {
  if (!config.openai.enabled) {
    aiHealth = { checked: true, ok: false, reason: 'missing_key' };
    return aiHealth;
  }

  try {
    await getClient().chat.completions.create({
      model: config.openai.model,
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Reply with OK' }],
    });
    aiHealth = { checked: true, ok: true, reason: null };
  } catch (err) {
    if (isQuotaError(err)) {
      aiHealth = { checked: true, ok: false, reason: 'no_credits' };
    } else if (err.status === 429) {
      aiHealth = { checked: true, ok: false, reason: 'rate_limited' };
    } else {
      aiHealth = { checked: true, ok: false, reason: 'error', message: err.message };
    }
  }

  return aiHealth;
};

const mapOpenAiError = (err) => {
  if (isQuotaError(err)) {
    return new ApiError(
      402,
      'Your Gemini API quota has been exhausted. Check your Google AI Studio quota and billing settings to use AI features.'
    );
  }
  if (err.status === 429) {
    return new ApiError(429, 'Gemini rate limit reached. Wait a minute and try again.');
  }
  return ApiError.server('AI request failed: ' + (err.message || 'unknown error'));
};

const shouldUseFallback = (err) => !config.isProd && isQuotaError(err);

const withFallback = async (action, fallbackFn) => {
  try {
    const result = await action();
    return { result, fallback: false };
  } catch (err) {
    if (shouldUseFallback(err)) {
      console.warn('[ai] Gemini credits unavailable — using local fallback summary');
      return { result: fallbackFn(), fallback: true, notice: FALLBACK_NOTICE };
    }
    throw mapOpenAiError(err);
  }
};

const requestCompletion = async (payload, { retries = 2 } = {}) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await getClient().chat.completions.create(payload);
    } catch (err) {
      if (shouldUseFallback(err)) throw err;
      if (err.status === 429 && !isQuotaError(err) && attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw err;
    }
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
  const { result, fallback, notice } = await withFallback(
    async () => {
      const res = await requestCompletion({
        model: config.openai.model,
        max_tokens: mode === 'detailed' || mode === 'chapters' ? 2400 : 1000,
        temperature: 0.4,
        messages: [
          { role: 'system', content: `You are an expert document analyst. ${instruction} Respond in markdown. Use the same language as the document.` },
          { role: 'user', content: clip(text) },
        ],
      });
      return res.choices[0]?.message?.content?.trim() || '';
    },
    () => fallbackSummarize(text, mode)
  );
  return { summary: result, fallback, notice };
};

export const extractInsights = async (text) => {
  const { result, fallback, notice } = await withFallback(
    async () => {
      const raw = await requestCompletion({
        model: config.openai.model,
        max_tokens: 1600,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Extract structured insights from the document. Respond with a JSON object with keys:
"keywords" (array of up to 15 important keywords/phrases),
"dates" (array of {date, context}),
"numbers" (array of {value, context} for significant figures, amounts, statistics),
"people" (array of {name, role} for people and organizations mentioned).
Only include items actually present in the text.`,
          },
          { role: 'user', content: clip(text) },
        ],
      }).then((res) => res.choices[0]?.message?.content?.trim() || '');
      try {
        return JSON.parse(raw);
      } catch {
        throw ApiError.server('AI returned an unexpected format. Please retry.');
      }
    },
    () => fallbackInsights(text)
  );
  return { insights: result, fallback, notice };
};

export const generateFlashcards = async (text, count = 10) => {
  const { result, fallback, notice } = await withFallback(
    async () => {
      const raw = await requestCompletion({
        model: config.openai.model,
        max_tokens: 2000,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Create ${count} study flashcards from the document. Respond with JSON: {"flashcards":[{"front":"question or term","back":"answer or definition"}]}. Make them varied and test real understanding.`,
          },
          { role: 'user', content: clip(text) },
        ],
      }).then((res) => res.choices[0]?.message?.content?.trim() || '');
      try {
        return JSON.parse(raw).flashcards || [];
      } catch {
        throw ApiError.server('AI returned an unexpected format. Please retry.');
      }
    },
    () => fallbackFlashcards(text, count)
  );
  return { flashcards: result, fallback, notice };
};

export const generateQuiz = async (text, count = 8) => {
  const { result, fallback, notice } = await withFallback(
    async () => {
      const raw = await requestCompletion({
        model: config.openai.model,
        max_tokens: 2400,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Create a ${count}-question multiple-choice quiz from the document. Respond with JSON:
{"questions":[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]}.
Exactly 4 options each. Vary the difficulty.`,
          },
          { role: 'user', content: clip(text) },
        ],
      }).then((res) => res.choices[0]?.message?.content?.trim() || '');
      try {
        return JSON.parse(raw).questions || [];
      } catch {
        throw ApiError.server('AI returned an unexpected format. Please retry.');
      }
    },
    () => fallbackQuiz(text, count)
  );
  return { questions: result, fallback, notice };
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
    const { result, fallback, notice } = await withFallback(
      async () => {
        const res = await requestCompletion({
          model: config.openai.model,
          max_tokens: 1600,
          temperature: 0.4,
          messages: [
            { role: 'system', content: `Translate the user's text into ${language}. Preserve tone, formatting and meaning. Return only the translation.` },
            { role: 'user', content: clip(text, 12000) },
          ],
        });
        return res.choices[0]?.message?.content?.trim() || '';
      },
      () => `[${language}] ${text}`
    );
    return { result, fallback, notice };
  }

  const prompt = TRANSFORM_PROMPTS[action];
  if (!prompt) throw ApiError.badRequest(`Unknown AI action: ${action}`);

  const { result, fallback, notice } = await withFallback(
    async () => {
      const res = await requestCompletion({
        model: config.openai.model,
        max_tokens: 1600,
        temperature: 0.4,
        messages: [
          { role: 'system', content: `${prompt} Return only the resulting text in markdown.` },
          { role: 'user', content: clip(text, 12000) },
        ],
      });
      return res.choices[0]?.message?.content?.trim() || '';
    },
    () => fallbackTransform(text, action)
  );
  return { result, fallback, notice };
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

  const { result, fallback, notice } = await withFallback(
    async () => {
      const res = await requestCompletion({
        model: config.openai.model,
        max_tokens: 1200,
        temperature: 0.3,
        messages,
      });
      return res.choices[0]?.message?.content?.trim() || '';
    },
    () => fallbackChat(documentText, question)
  );
  return { answer: result, fallback, notice };
};
