// import ApiError from '../utils/ApiError.js';
// import asyncHandler from '../utils/asyncHandler.js';
// import { verifyAccessToken } from '../utils/tokens.js';
// import User from '../models/User.js';

// /** Requires a valid Bearer access token. Attaches req.user */
// export const protect = asyncHandler(async (req, _res, next) => {
//   const header = req.headers.authorization || '';
//   const token = header.startsWith('Bearer ') ? header.slice(7) : null;
//   if (!token) throw ApiError.unauthorized('Please log in to continue');

//   let payload;
//   try {
//     payload = verifyAccessToken(token);
//   } catch {
//     throw ApiError.unauthorized('Session expired. Please log in again');
//   }

//   const user = await User.findById(payload.sub);
//   if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or deactivated');

//   req.user = user;
//   next();
// });

// /** Role based access control. Usage: restrictTo('admin') */
// export const restrictTo =
//   (...roles) =>
//   (req, _res, next) => {
//     if (!req.user || !roles.includes(req.user.role)) {
//       return next(ApiError.forbidden());
//     }
//     next();
//   };

// /** Optional auth - attaches req.user if a valid token is present, never fails */
// export const optionalAuth = asyncHandler(async (req, _res, next) => {
//   const header = req.headers.authorization || '';
//   const token = header.startsWith('Bearer ') ? header.slice(7) : null;
//   if (token) {
//     try {
//       const payload = verifyAccessToken(token);
//       req.user = await User.findById(payload.sub);
//     } catch {
//       /* ignore */
//     }
//   }
//   next();
// });






import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';
import prisma from '../config/prisma.js';

/** Requires a valid Bearer access token. Attaches req.user */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw ApiError.unauthorized('Please log in to continue');
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired. Please log in again');
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.sub,
    },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account not found or deactivated');
  }

  req.user = user;
  next();
});

/** Role based access control. Usage: restrictTo('admin') */
export const restrictTo =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }

    next();
  };

/** Optional auth - attaches req.user if a valid token is present, never fails */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

      if (user) {
        req.user = user;
      }
    } catch {
      /* ignore */
    }
  }

  next();
});