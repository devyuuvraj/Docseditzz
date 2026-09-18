import prisma from '../config/prisma.js';

import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';


/** GET /admin/stats - dashboard overview */
export const getStats = asyncHandler(async (_req, res) => {
  const now = new Date();

  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 3600 * 1000
  );

  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 3600 * 1000
  );

  const [
    totalUsers,
    newUsers30d,
    activeUsers7d,
    totalDocuments,
    storageAgg,
    planAgg,
    signupsByDay,
    actionsByDay,
    topActions,
  ] = await Promise.all([
    // Total users
    prisma.user.count(),

    // New users in last 30 days
    prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),

    // Users who logged in during last 7 days
    prisma.user.count({
      where: {
        lastLoginAt: {
          gte: sevenDaysAgo,
        },
      },
    }),

    // Total non-trashed documents
    prisma.document.count({
      where: {
        isTrashed: false,
      },
    }),

    // Total storage used by non-trashed documents
    prisma.document.aggregate({
      where: {
        isTrashed: false,
      },
      _sum: {
        size: true,
      },
    }),

    // Users grouped by plan
    prisma.user.groupBy({
      by: ['plan'],
      _count: {
        _all: true,
      },
    }),

    // Signups in last 30 days
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    // Activities in last 30 days
    prisma.activity.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    // Top actions in last 30 days
    prisma.activity.groupBy({
      by: ['action'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
      take: 10,
    }),
  ]);

  /*
   * PostgreSQL/Prisma does not have MongoDB's
   * $dateToString aggregation in this form.
   *
   * So we group the returned records by YYYY-MM-DD
   * in JavaScript.
   */

  const signupMap = {};

  for (const user of signupsByDay) {
    const date = user.createdAt
      .toISOString()
      .slice(0, 10);

    signupMap[date] = (signupMap[date] || 0) + 1;
  }

  const activityMap = {};

  for (const activity of actionsByDay) {
    const date = activity.createdAt
      .toISOString()
      .slice(0, 10);

    activityMap[date] =
      (activityMap[date] || 0) + 1;
  }

  const signups = Object.entries(signupMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      count,
    }));

  const activity = Object.entries(activityMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      count,
    }));

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        new30d: newUsers30d,
        active7d: activeUsers7d,
      },

      documents: {
        total: totalDocuments,
        storageBytes: storageAgg._sum.size || 0,
      },

      plans: Object.fromEntries(
        planAgg.map((p) => [
          p.plan,
          p._count._all,
        ])
      ),

      charts: {
        signups,
        activity,

        topActions: topActions.map((a) => ({
          action: a.action,
          count: a._count._all,
        })),
      },
    },
  });
});


/** GET /admin/users */
export const listUsers = asyncHandler(async (req, res) => {
  const {
    search,
    plan,
    role,
    page = 1,
    limit = 20,
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const where = {};

  if (search) {
    const searchText = String(search);

    where.OR = [
      {
        name: {
          contains: searchText,
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: searchText,
          mode: 'insensitive',
        },
      },
    ];
  }

  if (plan) {
    where.plan = plan;
  }

  if (role) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
    }),

    prisma.user.count({
      where,
    }),
  ]);

  res.json({
    success: true,
    data: {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        provider: u.provider,
        isVerified: u.isVerified,
        plan: u.plan,
        storageUsed: Number(u.storageUsed),
        storageLimit: Number(u.storageLimit),
        preferences: u.preferences,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    },
  });
});


/** PATCH /admin/users/:id - role / active / plan */
export const updateUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (
    user.id === req.user.id &&
    req.body.role === 'user'
  ) {
    throw ApiError.badRequest(
      'You cannot demote yourself'
    );
  }

  const {
    role,
    isActive,
    plan,
  } = req.body;

  const data = {};

  if (
    role &&
    ['user', 'admin'].includes(role)
  ) {
    data.role = role;
  }

  if (typeof isActive === 'boolean') {
    data.isActive = isActive;

    if (!isActive) {
      data.tokenVersion = {
        increment: 1,
      };
    }
  }

  if (
    plan &&
    ['free', 'pro', 'business'].includes(plan)
  ) {
    data.plan = plan;
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data,
  });

  res.json({
    success: true,
    message: 'User updated',

    data: {
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        provider: updatedUser.provider,
        isVerified: updatedUser.isVerified,
        plan: updatedUser.plan,
        storageUsed: Number(
          updatedUser.storageUsed
        ),
        storageLimit: Number(
          updatedUser.storageLimit
        ),
        preferences: updatedUser.preferences,
        isActive: updatedUser.isActive,
        lastLoginAt: updatedUser.lastLoginAt,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    },
  });
});


/** DELETE /admin/users/:id - deactivate */
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.id === req.user.id) {
    throw ApiError.badRequest(
      'You cannot deactivate yourself'
    );
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      isActive: false,
      tokenVersion: {
        increment: 1,
      },
    },
  });

  res.json({
    success: true,
    message: 'User deactivated',
  });
});


/** GET /admin/documents */
export const listAllDocuments = asyncHandler(async (req, res) => {
  const {
    search,
    type,
    page = 1,
    limit = 20,
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const where = {};

  if (search) {
    where.name = {
      contains: String(search),
      mode: 'insensitive',
    };
  }

  if (type) {
    where.type = type;
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,

      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

    prisma.document.count({
      where,
    }),
  ]);

  res.json({
    success: true,
    data: {
      documents,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    },
  });
});


/** GET /admin/logs - global activity log */
export const listLogs = asyncHandler(async (req, res) => {
  const {
    action,
    userId,
    page = 1,
    limit = 30,
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const where = {};

  if (action) {
    where.action = action;
  }

  if (userId) {
    where.userId = userId;
  }

  const [logs, total] = await Promise.all([
    prisma.activity.findMany({
      where,

      orderBy: {
        createdAt: 'desc',
      },

      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        document: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    prisma.activity.count({
      where,
    }),
  ]);

  res.json({
    success: true,
    data: {
      logs,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    },
  });
});


/** GET /admin/subscriptions */
export const listSubscriptions = asyncHandler(async (req, res) => {
  const {
    status,
    plan,
    page = 1,
    limit = 20,
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const where = {};

  if (status) {
    where.status = status;
  }

  if (plan) {
    where.plan = plan;
  }

  const [
    subscriptions,
    total,
    revenueAgg,
  ] = await Promise.all([
    prisma.subscription.findMany({
      where,

      orderBy: {
        createdAt: 'desc',
      },

      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

    prisma.subscription.count({
      where,
    }),

    prisma.subscription.aggregate({
      where: {
        status: 'active',
        plan: {
          not: 'free',
        },
      },

      _sum: {
        priceMonthly: true,
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      subscriptions,

      mrr: revenueAgg._sum.priceMonthly || 0,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    },
  });
});