import express from 'express';
import {
  createPin,
  getPinsByVersion,
  resolvePin
} from '../controllers/canvasController.js';

const router = express.Router();

router.post('/pins', createPin);
router.get('/pins/:version_id', getPinsByVersion);
router.patch('/pins/:pin_id/resolve', resolvePin);

export default router;
