import express from 'express';
import { getUsers, createUser, updateUserRole } from '../controllers/userController.js';

const router = express.Router();

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id/role', updateUserRole);

export default router;
