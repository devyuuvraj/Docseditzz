import User from '../models/User.js';
import Document from '../models/Document.js';
import Activity from '../models/Activity.js';
import Subscription from '../models/Subscription.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/** GET /admin/stats - dashboard overview */
export const getStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

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
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } }),
    Document.countDocuments({ isTrashed: false }),
    Document.aggregate([{ $match: { isTrashed: false } }, { $group: { _id: null, total: { $sum: '$size' } } }]),
    User.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
    User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Activity.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Activity.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      users: { total: totalUsers, new30d: newUsers30d, active7d: activeUsers7d },
      documents: { total: totalDocuments, storageBytes: storageAgg[0]?.total || 0 },
      plans: Object.fromEntries(planAgg.map((p) => [p._id, p.count])),
      charts: {
        signups: signupsByDay.map((d) => ({ date: d._id, count: d.count })),
        activity: actionsByDay.map((d) => ({ date: d._id, count: d.count })),
        topActions: topActions.map((a) => ({ action: a._id, count: a.count })),
      },
    },
  });
});

/** GET /admin/users */
export const listUsers = asyncHandler(async (req, res) => {
  const { search, plan, role, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (search) {
    const rx = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (plan) filter.plan = plan;
  if (role) filter.role = role;

  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      users: users.map((u) => ({ ...u.toSafeJSON(), isActive: u.isActive, lastLoginAt: u.lastLoginAt })),
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    },
  });
});

/** PATCH /admin/users/:id - role / active / plan */
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user._id.equals(req.user._id) && req.body.role === 'user') {
    throw ApiError.badRequest('You cannot demote yourself');
  }

  const { role, isActive, plan } = req.body;
  if (role && ['user', 'admin'].includes(role)) user.role = role;
  if (typeof isActive === 'boolean') {
    user.isActive = isActive;
    if (!isActive) user.tokenVersion += 1;
  }
  if (plan && ['free', 'pro', 'business'].includes(plan)) user.plan = plan;

  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'User updated', data: { user: user.toSafeJSON() } });
});

/** DELETE /admin/users/:id - deactivate */
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user._id.equals(req.user._id)) throw ApiError.badRequest('You cannot deactivate yourself');
  user.isActive = false;
  user.tokenVersion += 1;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'User deactivated' });
});

/** GET /admin/documents */
export const listAllDocuments = asyncHandler(async (req, res) => {
  const { search, type, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (search) filter.name = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (type) filter.type = type;

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('owner', 'name email'),
    Document.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      documents,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    },
  });
});

/** GET /admin/logs - global activity log */
export const listLogs = asyncHandler(async (req, res) => {
  const { action, userId, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (userId) filter.user = userId;

  const [logs, total] = await Promise.all([
    Activity.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('user', 'name email')
      .populate('document', 'name'),
    Activity.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { logs, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } },
  });
});

/** GET /admin/subscriptions */
export const listSubscriptions = asyncHandler(async (req, res) => {
  const { status, plan, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (plan) filter.plan = plan;

  const [subscriptions, total, revenueAgg] = await Promise.all([
    Subscription.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('user', 'name email'),
    Subscription.countDocuments(filter),
    Subscription.aggregate([
      { $match: { status: 'active', plan: { $ne: 'free' } } },
      { $group: { _id: null, mrr: { $sum: '$priceMonthly' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      subscriptions,
      mrr: revenueAgg[0]?.mrr || 0,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    },
  });
});
