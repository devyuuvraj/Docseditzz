import prisma from '../config/prisma.js';

export const logActivity = async (
  userId,
  action,
  {
    document = null,
    meta = {},
    req = null,
  } = {}
) => {
  try {
    await prisma.activity.create({
      data: {
        userId,
        action,
        documentId: document,
        meta,
        ip: req?.ip || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch (err) {
    console.error(
      '[activity] failed to log:',
      err.message
    );
  }
};