import { body, param, query } from 'express-validator';

export const objectIdParam = (name = 'id') =>
  param(name).isMongoId().withMessage(`Invalid ${name}`);

export const paginationRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const renameRules = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 chars'),
  body('isFavorite').optional().isBoolean().toBoolean(),
  body('folder').optional({ nullable: true }).custom((v) => v === null || /^[a-f\d]{24}$/i.test(v)),
];

export const folderRules = [
  body('name').trim().notEmpty().withMessage('Folder name is required').isLength({ max: 100 }),
  body('color').optional().matches(/^#[0-9a-f]{6}$/i),
  body('parent').optional({ nullable: true }).custom((v) => v === null || /^[a-f\d]{24}$/i.test(v)),
];

export const shareRules = [
  body('documentId').isMongoId().withMessage('documentId is required'),
  body('isPublic').optional().isBoolean().toBoolean(),
  body('password').optional({ values: 'falsy' }).isLength({ min: 4, max: 64 }),
  body('expiresAt').optional({ values: 'falsy' }).isISO8601().withMessage('expiresAt must be a date'),
];

export const aiTextRules = [
  body('text').optional().isString().isLength({ min: 1, max: 200000 }),
  body('documentId').optional().isMongoId(),
  body().custom((value) => {
    if (!value.text && !value.documentId) throw new Error('Provide text or documentId');
    return true;
  }),
];
