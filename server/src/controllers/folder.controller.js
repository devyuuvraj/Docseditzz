import prisma from '../config/prisma.js';

import { logActivity } from '../utils/activity.js';

import ApiError from '../utils/ApiError.js';

import asyncHandler from '../utils/asyncHandler.js';

/** GET /folders */
export const listFolders = asyncHandler(async (req, res) => {
  const folders = await prisma.folder.findMany({
    where: {
      ownerId: req.user.id,
    },

    orderBy: {
      name: 'asc',
    },
  });

  const counts = await prisma.document.groupBy({
    by: ['folderId'],

    where: {
      ownerId: req.user.id,
      isTrashed: false,
      folderId: {
        not: null,
      },
    },

    _count: {
      _all: true,
    },
  });

  const countMap = Object.fromEntries(
    counts.map((item) => [
      item.folderId,
      item._count._all,
    ])
  );

  const foldersWithCounts = folders.map((folder) => ({
    ...folder,
    fileCount: countMap[folder.id] || 0,
  }));

  res.json({
    success: true,
    data: {
      folders: foldersWithCounts,
    },
  });
});

/** POST /folders */
export const createFolder = asyncHandler(async (req, res) => {
  const { name, color, parent } = req.body;

  // Check parent folder belongs to current user.
  if (parent) {
    const parentFolder = await prisma.folder.findFirst({
      where: {
        id: parent,
        ownerId: req.user.id,
      },
    });

    if (!parentFolder) {
      throw ApiError.badRequest(
        'Parent folder not found'
      );
    }
  }

  const folder = await prisma.folder.create({
    data: {
      ownerId: req.user.id,
      name,
      color: color || '#3b82f6',
      parentId: parent || null,
    },
  });

  await logActivity(
    req.user.id,
    'folder_create',
    {
      meta: {
        name,
      },
      req,
    }
  );

  res.status(201).json({
    success: true,
    message: 'Folder created',
    data: {
      folder,
    },
  });
});

/** PATCH /folders/:id */
export const updateFolder = asyncHandler(async (req, res) => {
  const folder = await prisma.folder.findFirst({
    where: {
      id: req.params.id,
      ownerId: req.user.id,
    },
  });

  if (!folder) {
    throw ApiError.notFound('Folder not found');
  }

  const { name, color } = req.body;

  const updatedFolder = await prisma.folder.update({
    where: {
      id: folder.id,
    },

    data: {
      ...(name ? { name } : {}),
      ...(color ? { color } : {}),
    },
  });

  res.json({
    success: true,
    message: 'Folder updated',
    data: {
      folder: updatedFolder,
    },
  });
});

/** DELETE /folders/:id - moves contained documents to root */
export const deleteFolder = asyncHandler(async (req, res) => {
  const folder = await prisma.folder.findFirst({
    where: {
      id: req.params.id,
      ownerId: req.user.id,
    },
  });

  if (!folder) {
    throw ApiError.notFound('Folder not found');
  }

  /*
   * Move documents inside this folder to root.
   */
  await prisma.document.updateMany({
    where: {
      ownerId: req.user.id,
      folderId: folder.id,
    },

    data: {
      folderId: null,
    },
  });

  /*
   * Move child folders to root.
   */
  await prisma.folder.updateMany({
    where: {
      ownerId: req.user.id,
      parentId: folder.id,
    },

    data: {
      parentId: null,
    },
  });

  /*
   * Now delete the folder.
   */
  await prisma.folder.delete({
    where: {
      id: folder.id,
    },
  });

  res.json({
    success: true,
    message:
      'Folder deleted. Files were moved to My Files.',
  });
});