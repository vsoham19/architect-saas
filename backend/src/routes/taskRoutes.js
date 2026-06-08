import express from 'express';
import multer from 'multer';
import { getTasks, createTask, updateTaskStatus, deleteTask, uploadTaskImage, backtrackApproval } from '../controllers/taskController.js';

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.get('/', getTasks);
router.post('/', createTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);
router.post('/:id/upload', upload.single('file'), uploadTaskImage);
router.post('/:id/backtrack', backtrackApproval);

export default router;
