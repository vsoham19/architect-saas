import express from 'express';
import { getAuditLogs, createAuditLog } from '../controllers/auditController.js';

const router = express.Router();

router.get('/', getAuditLogs);
router.post('/', createAuditLog);

export default router;
