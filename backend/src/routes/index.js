const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const tenantRoutes = require('./tenantRoutes');
const userRoutes = require('./userRoutes');
const projectRoutes = require('./projectRoutes');
const taskRoutes = require('./taskRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/', userRoutes); // Includes /tenants/:tenantId/users and /users/:userId
router.use('/projects', projectRoutes);
router.use('/', taskRoutes); // Includes /projects/:projectId/tasks and /tasks/:taskId

module.exports = router;
