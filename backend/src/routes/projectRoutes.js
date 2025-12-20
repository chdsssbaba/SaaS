const express = require('express');
const router = express.Router();
const { createProject, listProjects, getProjectById, updateProject, deleteProject } = require('../controllers/projectController');
const authenticate = require('../middleware/authenticate');

// All project routes require authentication
router.post('/', authenticate, createProject);
router.get('/', authenticate, listProjects);
router.get('/:projectId', authenticate, getProjectById);
router.put('/:projectId', authenticate, updateProject);
router.delete('/:projectId', authenticate, deleteProject);

module.exports = router;
