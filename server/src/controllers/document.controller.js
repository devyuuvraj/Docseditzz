import prisma from '../config/prisma.js';

import { logActivity } from '../utils/activity.js';

import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

import {
  uploadBuffer,
  downloadToBuffer,
  deleteResource,
  resourceTypeFor,
} from '../services/storage.service.js';

import { detectDocType } from '../middleware/upload.js';
import { getPageCount } from '../services/pdf.service.js';


/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

const ownedDoc = async (
  id,
  userId,
  { includeTrashed = true } = {}
) => {
  const doc = await prisma.document.findFirst({
    where: {
      id,
      ownerId: userId,
    },
  });

  if (!doc) {
    throw ApiError.notFound('Document not found');
  }

  if (!includeTrashed && doc.isTrashed) {
    throw ApiError.notFound(
      'Document is in trash'
    );
  }

  return doc;
};


export const assertStorageAvailable = (
  user,
  incomingBytes
) => {
  const used = BigInt(user.storageUsed);
  const incoming = BigInt(incomingBytes);
  const limit = BigInt(user.storageLimit);

  if (used + incoming > limit) {
    throw new ApiError(
      413,
      'Storage limit reached. Upgrade your plan or free up space.'
    );
  }
};


/* -------------------------------------------------------
   Create Document from Buffer
------------------------------------------------------- */

/**
 * Creates a Document record from an in-memory buffer.
 * Used by upload and "save to library" tools.
 */
export const saveBufferAsDocument = async (
  user,
  buffer,
  {
    name,
    mimeType,
    folder = null,
  }
) => {
  assertStorageAvailable(
    user,
    buffer.length
  );

  const resourceType =
    resourceTypeFor(mimeType);

  const uploaded = await uploadBuffer(
    buffer,
    {
      folder: `docseditz/users/${user.id}`,
      filename: name,
      resourceType,
    }
  );

  let pages = 0;

  if (mimeType === 'application/pdf') {
    try {
      pages = await getPageCount(buffer);
    } catch {
      pages = 0;
    }
  }

  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      folderId: folder || null,

      name,
      originalName: name,

      type: detectDocType(mimeType),

      mimeType,
      size: buffer.length,
      pages,

      url: uploaded.secure_url,
      publicId: uploaded.public_id,

      thumbnail:
        resourceType === 'image'
          ? uploaded.secure_url
          : '',
    },
  });

  /*
   * Increase user's storage usage.
   *
   * Prisma storageUsed is BigInt, so use increment
   * instead of modifying user.storageUsed directly.
   */
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      storageUsed: {
        increment: BigInt(buffer.length),
      },
    },
  });

  /*
   * Keep the in-memory user object updated because
   * multiple files can be uploaded in one request.
   */
  user.storageUsed =
    BigInt(user.storageUsed) +
    BigInt(buffer.length);

  return doc;
};


/* -------------------------------------------------------
   UPLOAD
------------------------------------------------------- */

/** POST /documents/upload */
export const uploadDocuments = asyncHandler(
  async (req, res) => {
    const files = req.files?.length
      ? req.files
      : req.file
        ? [req.file]
        : [];

    if (!files.length) {
      throw ApiError.badRequest(
        'No files uploaded'
      );
    }

    const { folder } = req.body;

    if (folder) {
      const exists =
        await prisma.folder.findFirst({
          where: {
            id: folder,
            ownerId: req.user.id,
          },
        });

      if (!exists) {
        throw ApiError.badRequest(
          'Folder not found'
        );
      }
    }

    const docs = [];

    for (const file of files) {
      const doc =
        await saveBufferAsDocument(
          req.user,
          file.buffer,
          {
            name: file.originalname,
            mimeType: file.mimetype,
            folder: folder || null,
          }
        );

      docs.push(doc);

      await logActivity(
        req.user.id,
        'upload',
        {
          document: doc.id,
          meta: {
            name: doc.name,
            size: doc.size,
          },
          req,
        }
      );
    }

    res.status(201).json({
      success: true,
      message: `${docs.length} file(s) uploaded`,
      data: {
        documents: docs,
      },
    });
  }
);


/* -------------------------------------------------------
   LIST DOCUMENTS
------------------------------------------------------- */

/** GET /documents */
export const listDocuments = asyncHandler(
  async (req, res) => {
    const {
      search,
      folder,
      favorite,
      trashed,
      type,
      page = 1,
      limit = 20,
      sort = '-updatedAt',
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const where = {
      ownerId: req.user.id,

      isTrashed:
        trashed === 'true',
    };

    /*
     * MongoDB regex / i equivalent:
     * Prisma contains + mode insensitive.
     */
    if (search) {
      where.name = {
        contains: String(search),
        mode: 'insensitive',
      };
    }

    if (folder === 'none') {
      where.folderId = null;
    } else if (folder) {
      where.folderId = folder;
    }

    if (favorite === 'true') {
      where.isFavorite = true;
    }

    if (type) {
      where.type = type;
    }

    const sortMap = {
      '-updatedAt': {
        updatedAt: 'desc',
      },

      updatedAt: {
        updatedAt: 'asc',
      },

      name: {
        name: 'asc',
      },

      '-name': {
        name: 'desc',
      },

      '-size': {
        size: 'desc',
      },

      size: {
        size: 'asc',
      },

      '-createdAt': {
        createdAt: 'desc',
      },

      createdAt: {
        createdAt: 'asc',
      },
    };

    const orderBy =
      sortMap[sort] ||
      sortMap['-updatedAt'];

    const [documents, total] =
      await Promise.all([
        prisma.document.findMany({
          where,

          orderBy,

          skip:
            (pageNumber - 1) *
            limitNumber,

          take: limitNumber,

          include: {
            folder: {
              select: {
                name: true,
                color: true,
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
  }
);


/* -------------------------------------------------------
   RECENT DOCUMENTS
------------------------------------------------------- */

/** GET /documents/recent */
export const recentDocuments =
  asyncHandler(async (req, res) => {
    const documents =
      await prisma.document.findMany({
        where: {
          ownerId: req.user.id,
          isTrashed: false,
        },

        orderBy: [
          {
            lastOpenedAt: 'desc',
          },
          {
            updatedAt: 'desc',
          },
        ],

        take: 8,
      });

    res.json({
      success: true,
      data: {
        documents,
      },
    });
  });


/* -------------------------------------------------------
   GET DOCUMENT
------------------------------------------------------- */

/** GET /documents/:id */
export const getDocument =
  asyncHandler(async (req, res) => {
    const doc = await ownedDoc(
      req.params.id,
      req.user.id
    );

    const updatedDoc =
      await prisma.document.update({
        where: {
          id: doc.id,
        },

        data: {
          lastOpenedAt: new Date(),
        },
      });

    res.json({
      success: true,
      data: {
        document: updatedDoc,
      },
    });
  });


/* -------------------------------------------------------
   DOWNLOAD
------------------------------------------------------- */

/** GET /documents/:id/download */
export const downloadDocument =
  asyncHandler(async (req, res) => {
    const doc = await ownedDoc(
      req.params.id,
      req.user.id
    );

    const buffer =
      await downloadToBuffer(doc.url);

    const updatedDoc =
      await prisma.document.update({
        where: {
          id: doc.id,
        },

        data: {
          downloadCount: {
            increment: 1,
          },
        },
      });

    await logActivity(
      req.user.id,
      'download',
      {
        document: doc.id,
        meta: {
          name: doc.name,
        },
        req,
      }
    );

    res.setHeader(
      'Content-Type',
      doc.mimeType ||
        'application/octet-stream'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(
        doc.name
      )}"`
    );

    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Disposition'
    );

    res.end(buffer);
  });


/* -------------------------------------------------------
   UPDATE DOCUMENT
------------------------------------------------------- */

/** PATCH /documents/:id */
export const updateDocument =
  asyncHandler(async (req, res) => {
    const doc = await ownedDoc(
      req.params.id,
      req.user.id
    );

    const {
      name,
      isFavorite,
      folder,
      annotations,
    } = req.body;

    const data = {};

    if (name !== undefined) {
      data.name = String(name)
        .trim()
        .slice(0, 255);

      await logActivity(
        req.user.id,
        'rename',
        {
          document: doc.id,
          meta: {
            name: data.name,
          },
          req,
        }
      );
    }

    if (isFavorite !== undefined) {
      data.isFavorite = !!isFavorite;

      await logActivity(
        req.user.id,
        data.isFavorite
          ? 'favorite'
          : 'unfavorite',
        {
          document: doc.id,
          req,
        }
      );
    }

    if (folder !== undefined) {
      if (folder) {
        const exists =
          await prisma.folder.findFirst({
            where: {
              id: folder,
              ownerId: req.user.id,
            },
          });

        if (!exists) {
          throw ApiError.badRequest(
            'Folder not found'
          );
        }

        data.folderId = folder;
      } else {
        data.folderId = null;
      }
    }

    if (annotations !== undefined) {
      data.annotations = annotations;
    }

    const updatedDoc =
      await prisma.document.update({
        where: {
          id: doc.id,
        },

        data,
      });

    res.json({
      success: true,
      message: 'Document updated',
      data: {
        document: updatedDoc,
      },
    });
  });


/* -------------------------------------------------------
   DUPLICATE
------------------------------------------------------- */

/** POST /documents/:id/duplicate */
export const duplicateDocument =
  asyncHandler(async (req, res) => {
    const doc = await ownedDoc(
      req.params.id,
      req.user.id,
      {
        includeTrashed: false,
      }
    );

    const buffer =
      await downloadToBuffer(doc.url);

    const dotIdx =
      doc.name.lastIndexOf('.');

    const copyName =
      dotIdx > 0
        ? `${doc.name.slice(
            0,
            dotIdx
          )} (copy)${doc.name.slice(dotIdx)}`
        : `${doc.name} (copy)`;

    const copy =
      await saveBufferAsDocument(
        req.user,
        buffer,
        {
          name: copyName,
          mimeType: doc.mimeType,
          folder: doc.folderId,
        }
      );

    await logActivity(
      req.user.id,
      'duplicate',
      {
        document: copy.id,
        meta: {
          from: doc.name,
        },
        req,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Document duplicated',
      data: {
        document: copy,
      },
    });
  });


/* -------------------------------------------------------
   SAVE VERSION
------------------------------------------------------- */

/** POST /documents/:id/version */
export const saveVersion =
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw ApiError.badRequest(
        'No file provided'
      );
    }

    const doc = await ownedDoc(
      req.params.id,
      req.user.id,
      {
        includeTrashed: false,
      }
    );

    /*
     * Make sure enough storage exists for the
     * new uploaded file.
     */
    assertStorageAvailable(
      req.user,
      req.file.buffer.length
    );

    /*
     * Save the CURRENT file as a version.
     */
    await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        url: doc.url,
        publicId: doc.publicId,
        size: doc.size,
        label:
          req.body.label ||
          'Auto save',
      },
    });

    /*
     * Keep only latest 10 versions.
     */
    const versions =
      await prisma.documentVersion.findMany({
        where: {
          documentId: doc.id,
        },

        orderBy: {
          createdAt: 'desc',
        },

        select: {
          id: true,
        },
      });

    if (versions.length > 10) {
      const oldVersions =
        versions.slice(10);

      await prisma.documentVersion.deleteMany({
        where: {
          id: {
            in: oldVersions.map(
              (version) => version.id
            ),
          },
        },
      });
    }

    /*
     * Upload new file.
     */
    const uploaded =
      await uploadBuffer(
        req.file.buffer,
        {
          folder: `docseditz/users/${req.user.id}`,
          filename: doc.name,
          resourceType:
            resourceTypeFor(
              doc.mimeType
            ),
        }
      );

    /*
     * Increase storage usage.
     */
    await prisma.user.update({
      where: {
        id: req.user.id,
      },

      data: {
        storageUsed: {
          increment: BigInt(
            req.file.buffer.length
          ),
        },
      },
    });

    req.user.storageUsed =
      BigInt(req.user.storageUsed) +
      BigInt(req.file.buffer.length);

    const updateData = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      size: req.file.buffer.length,
    };

    if (req.body.annotations) {
      try {
        updateData.annotations =
          JSON.parse(
            req.body.annotations
          );
      } catch {
        // Ignore malformed annotations.
      }
    }

    const updatedDoc =
      await prisma.document.update({
        where: {
          id: doc.id,
        },

        data: updateData,
      });

    await logActivity(
      req.user.id,
      'edit',
      {
        document: doc.id,
        meta: {
          name: doc.name,
        },
        req,
      }
    );

    res.json({
      success: true,
      message: 'Saved',
      data: {
        document: updatedDoc,
      },
    });
  });


/* -------------------------------------------------------
   RESTORE VERSION
------------------------------------------------------- */

/** POST /documents/:id/restore-version/:versionId */
export const restoreVersion =
  asyncHandler(async (req, res) => {
    const doc = await ownedDoc(
      req.params.id,
      req.user.id,
      {
        includeTrashed: false,
      }
    );

    const version =
      await prisma.documentVersion.findFirst({
        where: {
          id: req.params.versionId,
          documentId: doc.id,
        },
      });

    if (!version) {
      throw ApiError.notFound(
        'Version not found'
      );
    }

    /*
     * Save current document as a version
     * before restoring the selected version.
     */
    await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        url: doc.url,
        publicId: doc.publicId,
        size: doc.size,
        label: 'Before restore',
      },
    });

    /*
     * Restore selected version.
     */
    const updatedDoc =
      await prisma.document.update({
        where: {
          id: doc.id,
        },

        data: {
          url: version.url,
          publicId: version.publicId,
          size: version.size,
        },
      });

    /*
     * Remove restored version, matching
     * the old MongoDB behavior.
     */
    await prisma.documentVersion.delete({
      where: {
        id: version.id,
      },
    });

    /*
     * Keep only latest 10 versions.
     */
    const versions =
      await prisma.documentVersion.findMany({
        where: {
          documentId: doc.id,
        },

        orderBy: {
          createdAt: 'desc',
        },

        select: {
          id: true,
        },
      });

    if (versions.length > 10) {
      await prisma.documentVersion.deleteMany({
        where: {
          id: {
            in: versions
              .slice(10)
              .map(
                (version) =>
                  version.id
              ),
          },
        },
      });
    }

    res.json({
      success: true,
      message: 'Version restored',
      data: {
        document: updatedDoc,
      },
    });
  });


/* -------------------------------------------------------
   TRASH
------------------------------------------------------- */

/** DELETE /documents/:id */
export const trashDocument =
  asyncHandler(async (req, res) => {
    const doc = await ownedDoc(
      req.params.id,
      req.user.id
    );

    await prisma.document.update({
      where: {
        id: doc.id,
      },

      data: {
        isTrashed: true,
        trashedAt: new Date(),
      },
    });

    await logActivity(
      req.user.id,
      'delete',
      {
        document: doc.id,
        meta: {
          name: doc.name,
        },
        req,
      }
    );

    res.json({
      success: true,
      message: 'Moved to trash',
    });
  });


/* -------------------------------------------------------
   RESTORE DOCUMENT
------------------------------------------------------- */

/** POST /documents/:id/restore */
export const restoreDocument =
  asyncHandler(async (req, res) => {
    const doc = await ownedDoc(
      req.params.id,
      req.user.id
    );

    const updatedDoc =
      await prisma.document.update({
        where: {
          id: doc.id,
        },

        data: {
          isTrashed: false,
          trashedAt: null,
        },
      });

    await logActivity(
      req.user.id,
      'restore',
      {
        document: doc.id,
        meta: {
          name: doc.name,
        },
        req,
      }
    );

    res.json({
      success: true,
      message: 'Restored from trash',
      data: {
        document: updatedDoc,
      },
    });
  });


/* -------------------------------------------------------
   PERMANENT DELETE
------------------------------------------------------- */

/** DELETE /documents/:id/permanent */
export const permanentDelete =
  asyncHandler(async (req, res) => {
    const doc = await ownedDoc(
      req.params.id,
      req.user.id
    );

    /*
     * Get versions before deleting the document.
     */
    const versions =
      await prisma.documentVersion.findMany({
        where: {
          documentId: doc.id,
        },
      });

    /*
     * Delete current file.
     */
    await deleteResource(
      doc.publicId,
      resourceTypeFor(
        doc.mimeType
      )
    );

    /*
     * Delete all version files.
     */
    for (const version of versions) {
      await deleteResource(
        version.publicId,
        resourceTypeFor(
          doc.mimeType
        )
      );
    }

    /*
     * Reduce storage.
     */
    await prisma.user.update({
      where: {
        id: req.user.id,
      },

      data: {
        storageUsed: {
          decrement: BigInt(doc.size),
        },
      },
    });

    req.user.storageUsed =
      BigInt(req.user.storageUsed) -
      BigInt(doc.size);

    /*
     * Delete document.
     *
     * DocumentVersion records should be removed
     * through the relation's cascade.
     */
    await prisma.document.delete({
      where: {
        id: doc.id,
      },
    });

    await logActivity(
      req.user.id,
      'permanent_delete',
      {
        meta: {
          name: doc.name,
        },
        req,
      }
    );

    res.json({
      success: true,
      message: 'Permanently deleted',
    });
  });


/* -------------------------------------------------------
   EMPTY TRASH
------------------------------------------------------- */

/** DELETE /documents/trash/empty */
export const emptyTrash =
  asyncHandler(async (req, res) => {
    const docs =
      await prisma.document.findMany({
        where: {
          ownerId: req.user.id,
          isTrashed: true,
        },
      });

    let freed = 0;

    for (const doc of docs) {
      const versions =
        await prisma.documentVersion.findMany({
          where: {
            documentId: doc.id,
          },
        });

      await deleteResource(
        doc.publicId,
        resourceTypeFor(
          doc.mimeType
        )
      );

      for (const version of versions) {
        await deleteResource(
          version.publicId,
          resourceTypeFor(
            doc.mimeType
          )
        );
      }

      freed += doc.size;

      await prisma.document.delete({
        where: {
          id: doc.id,
        },
      });
    }

    if (freed > 0) {
      await prisma.user.update({
        where: {
          id: req.user.id,
        },

        data: {
          storageUsed: {
            decrement: BigInt(freed),
          },
        },
      });

      req.user.storageUsed =
        BigInt(req.user.storageUsed) -
        BigInt(freed);
    }

    res.json({
      success: true,
      message: `Trash emptied (${docs.length} files)`,
    });
  });