import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Runs an array of express-validator chains and returns 400 with
 * field-level details when validation fails.
 */
export const validate = (chains) => [
  ...chains,
  (req, _res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    next(ApiError.badRequest('Validation failed', details));
  },
];

export default validate;
