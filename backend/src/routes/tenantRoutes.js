const express = require('express');
const router = express.Router();
const { getTenantDetails, updateTenant, listTenants } = require('../controllers/tenantController');
const authenticate = require('../middleware/authenticate');

// All tenant routes require authentication
router.get('/', authenticate, listTenants); // Super admin only
router.get('/:tenantId', authenticate, getTenantDetails);
router.put('/:tenantId', authenticate, updateTenant);

module.exports = router;
