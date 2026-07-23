import Activity from '../models/Activity.js';
import asyncHandler from '../utils/asyncHandler.js';

/** GET /activities */
export const listActivities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [activities, total] = await Promise.all([
    Activity.find({ user: req.user._id })
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('document', 'name type'),
    Activity.countDocuments({ user: req.user._id }),
  ]);
  res.json({
    success: true,
    data: {
      activities,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    },
  });
});

/** GET /activities/downloads - download history */
export const downloadHistory = asyncHandler(async (req, res) => {
  const activities = await Activity.find({ user: req.user._id, action: 'download' })
    .sort('-createdAt')
    .limit(50)
    .populate('document', 'name type size');
  res.json({ success: true, data: { activities } });
});
