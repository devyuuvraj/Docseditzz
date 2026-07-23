import { Router } from 'express';
import * as folders from '../controllers/folder.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdParam, folderRules } from '../validators/common.validators.js';

const router = Router();
router.use(protect);

router.get('/', folders.listFolders);
router.post('/', validate(folderRules), folders.createFolder);
router.patch('/:id', validate([objectIdParam()]), folders.updateFolder);
router.delete('/:id', validate([objectIdParam()]), folders.deleteFolder);

export default router;
