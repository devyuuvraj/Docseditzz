import prisma from '../config/prisma.js';

import asyncHandler from '../utils/asyncHandler.js';

/** GET /activities */
export const listActivities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const skip = (pageNumber - 1) * limitNumber;

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: {
        userId: req.user.id,
      },

      orderBy: {
        createdAt: 'desc',
      },

      skip,

      take: limitNumber,

      include: {
        document: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    }),

    prisma.activity.count({
      where: {
        userId: req.user.id,
      },
    }),
  ]);

  res.json({
    success: true,

    data: {
      activities,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    },
  });
});

/** GET /activities/downloads - download history */
export const downloadHistory = asyncHandler(async (req, res) => {
  const activities = await prisma.activity.findMany({
    where: {
      userId: req.user.id,
      action: 'download',
    },

    orderBy: {
      createdAt: 'desc',
    },

    take: 50,

    include: {
      document: {
        select: {
          name: true,
          type: true,
          size: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      activities,
    },
  });
});