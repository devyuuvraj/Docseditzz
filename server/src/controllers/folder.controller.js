import Folder from '../models/Folder.js';
import Document from '../models/Document.js';
import { logActivity } from '../models/Activity.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/** GET /folders */
export const listFolders = asyncHandler(async (req, res) => {
  const folders = await Folder.find({ owner: req.user._id }).sort('name').lean();
  const counts = await Document.aggregate([
    { $match: { owner: req.user._id, isTrashed: false, folder: { $ne: null } } },
    { $group: { _id: '$folder', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));
  res.json({
    success: true,
    data: { folders: folders.map((f) => ({ ...f, fileCount: countMap[f._id.toString()] || 0 })) },
  });
});

/** POST /folders */
export const createFolder = asyncHandler(async (req, res) => {
  const { name, color, parent } = req.body;
  if (parent) {
    const parentFolder = await Folder.findOne({ _id: parent, owner: req.user._id });
    if (!parentFolder) throw ApiError.badRequest('Parent folder not found');
  }
  const folder = await Folder.create({ owner: req.user._id, name, color, parent: parent || null });
  await logActivity(req.user._id, 'folder_create', { meta: { name }, req });
  res.status(201).json({ success: true, message: 'Folder created', data: { folder } });
});

/** PATCH /folders/:id */
export const updateFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
  if (!folder) throw ApiError.notFound('Folder not found');
  const { name, color } = req.body;
  if (name) folder.name = name;
  if (color) folder.color = color;
  await folder.save();
  res.json({ success: true, message: 'Folder updated', data: { folder } });
});

/** DELETE /folders/:id - moves contained documents to root */
export const deleteFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
  if (!folder) throw ApiError.notFound('Folder not found');
  await Document.updateMany({ owner: req.user._id, folder: folder._id }, { folder: null });
  await Folder.updateMany({ owner: req.user._id, parent: folder._id }, { parent: null });
  await folder.deleteOne();
  res.json({ success: true, message: 'Folder deleted. Files were moved to My Files.' });
});
