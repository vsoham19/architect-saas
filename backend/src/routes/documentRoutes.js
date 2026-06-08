import express from 'express';
import { 
  getDocuments, createDocument, updateDocumentVersion,
  getDocVersions, createDocVersion,
  getDocReviews, createDocReview,
  getDocApprovals, createDocApproval,
  getApprovalTaskTags, createApprovalTaskTags,
  uploadDrawing, updateVersionDrawingData
} from '../controllers/documentController.js';

const router = express.Router();

// Documents
router.get('/', getDocuments);
router.post('/', createDocument);
router.patch('/:id/version', updateDocumentVersion);
router.post('/upload-drawing', uploadDrawing);

// Versions
router.get('/versions', getDocVersions);
router.post('/versions', createDocVersion);
router.patch('/versions/:id/drawing-data', updateVersionDrawingData);

// Reviews
router.get('/reviews', getDocReviews);
router.post('/reviews', createDocReview);

// Approvals
router.get('/approvals', getDocApprovals);
router.post('/approvals', createDocApproval);

// Tags
router.get('/tags', getApprovalTaskTags);
router.post('/tags', createApprovalTaskTags);

export default router;
