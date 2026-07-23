import { Router } from 'express';
import * as docs from '../controllers/document.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { objectIdParam, paginationRules, renameRules } from '../validators/common.validators.js';

const router = Router();
router.use(protect);

router.get('/', validate(paginationRules), docs.listDocuments);
router.get('/recent', docs.recentDocuments);
router.post('/upload', upload.array('files', 20), docs.uploadDocuments);
router.delete('/trash/empty', docs.emptyTrash);

router.get('/:id', validate([objectIdParam()]), docs.getDocument);
router.get('/:id/download', validate([objectIdParam()]), docs.downloadDocument);
router.patch('/:id', validate([objectIdParam(), ...renameRules]), docs.updateDocument);
router.post('/:id/duplicate', validate([objectIdParam()]), docs.duplicateDocument);
router.post('/:id/version', validate([objectIdParam()]), upload.single('file'), docs.saveVersion);
router.post('/:id/restore-version/:versionId', validate([objectIdParam()]), docs.restoreVersion);
router.delete('/:id', validate([objectIdParam()]), docs.trashDocument);
router.post('/:id/restore', validate([objectIdParam()]), docs.restoreDocument);
router.delete('/:id/permanent', validate([objectIdParam()]), docs.permanentDelete);

export default router;
