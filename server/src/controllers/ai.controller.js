import prisma from '../config/prisma.js';

import { logActivity } from '../utils/activity.js';

import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

import { downloadToBuffer } from '../services/storage.service.js';

import {
  extractPdfText,
  extractDocxText,
} from '../services/text.service.js';

import {
  summarize,
  extractInsights,
  generateFlashcards,
  generateQuiz,
  transformText,
  chatWithDocument,
} from '../services/ai.service.js';


const aiMeta = ({ fallback, notice }) =>
  fallback
    ? {
        fallback: true,
        notice,
      }
    : {};


/**
 * Resolves the working text:
 *
 * 1. Uploaded file
 * 2. Raw text from request body
 * 3. Stored documentId
 *
 * For stored documents, extracted text is cached
 * inside the Document record.
 */
const resolveText = async (req) => {
  /*
   * 1. Uploaded file
   */
  if (req.file) {
    if (req.file.mimetype === 'application/pdf') {
      const { text } = await extractPdfText(
        req.file.buffer
      );

      return text;
    }

    if (
      req.file.mimetype.includes(
        'wordprocessingml'
      ) ||
      req.file.mimetype ===
        'application/msword'
    ) {
      return extractDocxText(req.file.buffer);
    }

    if (req.file.mimetype === 'text/plain') {
      return req.file.buffer.toString('utf-8');
    }

    throw ApiError.badRequest(
      'Supported files: PDF, DOCX, TXT'
    );
  }


  /*
   * 2. Raw text
   */
  if (req.body.text) {
    return String(req.body.text);
  }


  /*
   * 3. Stored document
   */
  if (req.body.documentId) {
    const doc = await prisma.document.findFirst({
      where: {
        id: req.body.documentId,
        ownerId: req.user.id,
        isTrashed: false,
      },
    });

    if (!doc) {
      throw ApiError.notFound(
        'Document not found'
      );
    }


    /*
     * Use cached extracted text if available.
     */
    if (doc.extractedText) {
      return doc.extractedText;
    }


    /*
     * Download original document.
     */
    const buffer = await downloadToBuffer(
      doc.url
    );

    let text;


    if (doc.type === 'pdf') {
      text = (
        await extractPdfText(buffer)
      ).text;
    } else if (
      doc.type === 'docx' ||
      doc.type === 'doc'
    ) {
      text = await extractDocxText(buffer);
    } else if (doc.type === 'txt') {
      text = buffer.toString('utf-8');
    } else {
      throw ApiError.badRequest(
        'AI features support PDF, DOCX and TXT documents'
      );
    }


    /*
     * Cache extracted text.
     *
     * Limit remains the same as the old controller:
     * maximum 500,000 characters.
     */
    const extractedText =
      text.slice(0, 500000);

    await prisma.document.update({
      where: {
        id: doc.id,
      },
      data: {
        extractedText,
      },
    });

    return text;
  }


  /*
   * Nothing provided.
   */
  throw ApiError.badRequest(
    'Provide text, a file, or a documentId'
  );
};


const ensureText = (text) => {
  if (
    !text ||
    text.trim().length < 20
  ) {
    throw ApiError.badRequest(
      'Not enough text found. If this is a scanned document, run OCR first.'
    );
  }

  return text.trim();
};


/** POST /ai/summarize
 * { mode: short|medium|detailed|bullets|chapters }
 */
export const summarizeHandler =
  asyncHandler(async (req, res) => {
    const text = ensureText(
      await resolveText(req)
    );

    const mode = [
      'short',
      'medium',
      'detailed',
      'bullets',
      'chapters',
    ].includes(req.body.mode)
      ? req.body.mode
      : 'medium';

    const {
      summary,
      fallback,
      notice,
    } = await summarize(
      text,
      mode
    );

    await logActivity(
      req.user.id,
      'summarize',
      {
        meta: {
          mode,
          chars: text.length,
          fallback,
        },
        req,
      }
    );

    res.json({
      success: true,
      data: {
        summary,
        mode,
        ...aiMeta({
          fallback,
          notice,
        }),
      },
    });
  });


/** POST /ai/insights
 * keywords, dates, numbers, people
 */
export const insightsHandler =
  asyncHandler(async (req, res) => {
    const text = ensureText(
      await resolveText(req)
    );

    const {
      insights,
      fallback,
      notice,
    } = await extractInsights(text);

    await logActivity(
      req.user.id,
      'ai',
      {
        meta: {
          feature: 'insights',
          fallback,
        },
        req,
      }
    );

    res.json({
      success: true,
      data: {
        insights,
        ...aiMeta({
          fallback,
          notice,
        }),
      },
    });
  });


/** POST /ai/flashcards */
export const flashcardsHandler =
  asyncHandler(async (req, res) => {
    const text = ensureText(
      await resolveText(req)
    );

    const count = Math.max(
      3,
      Math.min(
        25,
        Number(req.body.count || 10)
      )
    );

    const {
      flashcards,
      fallback,
      notice,
    } = await generateFlashcards(
      text,
      count
    );

    await logActivity(
      req.user.id,
      'ai',
      {
        meta: {
          feature: 'flashcards',
          count,
          fallback,
        },
        req,
      }
    );

    res.json({
      success: true,
      data: {
        flashcards,
        ...aiMeta({
          fallback,
          notice,
        }),
      },
    });
  });


/** POST /ai/quiz */
export const quizHandler =
  asyncHandler(async (req, res) => {
    const text = ensureText(
      await resolveText(req)
    );

    const count = Math.max(
      3,
      Math.min(
        20,
        Number(req.body.count || 8)
      )
    );

    const {
      questions,
      fallback,
      notice,
    } = await generateQuiz(
      text,
      count
    );

    await logActivity(
      req.user.id,
      'ai',
      {
        meta: {
          feature: 'quiz',
          count,
          fallback,
        },
        req,
      }
    );

    res.json({
      success: true,
      data: {
        questions,
        ...aiMeta({
          fallback,
          notice,
        }),
      },
    });
  });


/** POST /ai/transform
 * { text, action, language? }
 */
export const transformHandler =
  asyncHandler(async (req, res) => {
    const {
      action,
      language,
    } = req.body;

    const text = String(
      req.body.text || ''
    ).trim();

    if (!text) {
      throw ApiError.badRequest(
        'Text is required'
      );
    }

    if (text.length > 20000) {
      throw ApiError.badRequest(
        'Selection too long (max 20,000 characters)'
      );
    }

    if (!action) {
      throw ApiError.badRequest(
        'Action is required'
      );
    }

    const {
      result,
      fallback,
      notice,
    } = await transformText(
      text,
      action,
      { language }
    );

    await logActivity(
      req.user.id,
      'ai',
      {
        meta: {
          feature: action,
          fallback,
        },
        req,
      }
    );

    res.json({
      success: true,
      data: {
        result,
        action,
        ...aiMeta({
          fallback,
          notice,
        }),
      },
    });
  });


/** POST /ai/chat
 * { documentId | text, question, history: [{role, content}] }
 */
export const chatHandler =
  asyncHandler(async (req, res) => {
    const question = String(
      req.body.question || ''
    ).trim();

    if (!question) {
      throw ApiError.badRequest(
        'Question is required'
      );
    }

    if (question.length > 2000) {
      throw ApiError.badRequest(
        'Question too long'
      );
    }

    const text = ensureText(
      await resolveText(req)
    );

    const history =
      Array.isArray(req.body.history)
        ? req.body.history
        : [];

    const {
      answer,
      fallback,
      notice,
    } = await chatWithDocument(
      text,
      question,
      history
    );

    await logActivity(
      req.user.id,
      'ai',
      {
        meta: {
          feature: 'chat',
          fallback,
        },
        req,
      }
    );

    res.json({
      success: true,
      data: {
        answer,
        ...aiMeta({
          fallback,
          notice,
        }),
      },
    });
  });