import express from 'express';
import {
  getDrawingElements,
  getLatestDiff,
  triggerAnalysis
} from '../controllers/aiController.js';

const router = express.Router();

router.get('/drawing-elements/:version_id', getDrawingElements);
router.get('/diff/:document_id', getLatestDiff);
router.post('/trigger/:version_id', triggerAnalysis);

export default router;
