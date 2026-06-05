import express from 'express';
import { 
  getProjects, createProject, updateProjectStatus, 
  getProjectMembers, assignProjectMembers 
} from '../controllers/projectController.js';

const router = express.Router();

router.get('/', getProjects);
router.post('/', createProject);
router.patch('/:id/status', updateProjectStatus);

router.get('/members', getProjectMembers);
router.post('/members/assign', assignProjectMembers);

export default router;
