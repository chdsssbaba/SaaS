const express = require('express');
const router = express.Router();
const { createTask, listTasks, updateTaskStatus, updateTask } = require('../controllers/taskController');
const authenticate = require('../middleware/authenticate');

// All task routes require authentication
router.post('/projects/:projectId/tasks', authenticate, createTask);
router.get('/projects/:projectId/tasks', authenticate, listTasks);
router.patch('/tasks/:taskId/status', authenticate, updateTaskStatus);
router.put('/tasks/:taskId', authenticate, updateTask);

module.exports = router;
