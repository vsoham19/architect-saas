import express from 'express';
import {
  getDrawingElements,
  getLatestDiff
} from '../controllers/aiController.js';

const router = express.Router();

router.get('/drawing-elements/:version_id', getDrawingElements);
router.get('/diff/:document_id', getLatestDiff);

export default router;
