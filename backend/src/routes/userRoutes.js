const express = require('express');
const router = express.Router();
const { addUser, listUsers, updateUser, deleteUser, listAllUsers } = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');

// User management routes - all require authentication
router.get('/users', authenticate, listAllUsers); // Super admin: list all users
router.post('/tenants/:tenantId/users', authenticate, addUser);
router.get('/tenants/:tenantId/users', authenticate, listUsers);
router.put('/users/:userId', authenticate, updateUser);
router.delete('/users/:userId', authenticate, deleteUser);

module.exports = router;
