import { body, param, query } from 'express-validator';

// Prisma IDs are CUID strings, not MongoDB ObjectIds.
const isValidId = (value) => {
  if (value === null || value === undefined) return false;

  // Prisma CUID format used by this project.
  return typeof value === 'string' && /^c[a-z0-9]{20,}$/i.test(value);
};

export const objectIdParam = (name = 'id') =>
  param(name)
    .custom(isValidId)
    .withMessage(`Invalid ${name}`);

export const paginationRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const renameRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be 1-255 chars'),

  body('isFavorite')
    .optional()
    .isBoolean()
    .toBoolean(),

  body('folder')
    .optional({ nullable: true })
    .custom((value) => value === null || isValidId(value))
    .withMessage('Invalid folder'),
];

export const folderRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Folder name is required')
    .isLength({ max: 100 }),

  body('color')
    .optional()
    .matches(/^#[0-9a-f]{6}$/i),

  body('parent')
    .optional({ nullable: true })
    .custom((value) => value === null || isValidId(value))
    .withMessage('Invalid parent folder'),
];

export const shareRules = [
  body('documentId')
    .custom(isValidId)
    .withMessage('documentId is required'),

  body('isPublic')
    .optional()
    .isBoolean()
    .toBoolean(),

  body('password')
    .optional({ values: 'falsy' })
    .isLength({ min: 4, max: 64 }),

  body('expiresAt')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('expiresAt must be a date'),
];

export const aiTextRules = [
  body('text')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200000 }),

  body('documentId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid documentId'),

  body().custom((value) => {
    if (!value.text && !value.documentId) {
      throw new Error('Provide text or documentId');
    }
    return true;
  }),
];