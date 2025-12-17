const { pool } = require('../config/database');

/**
 * Log an action to the audit_logs table
 * @param {Object} params - Audit log parameters
 * @param {string} params.tenantId - Tenant ID (null for super_admin actions)
 * @param {string} params.userId - User ID who performed the action
 * @param {string} params.action - Action type (e.g., 'CREATE_USER', 'DELETE_PROJECT')
 * @param {string} params.entityType - Entity type (e.g., 'user', 'project', 'task')
 * @param {string} params.entityId - ID of the affected entity
 * @param {string} params.ipAddress - User's IP address (optional)
 */
async function logAudit({ tenantId, userId, action, entityType, entityId, ipAddress }) {
    try {
        const query = `
      INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

        await pool.query(query, [
            tenantId || null,
            userId || null,
            action,
            entityType || null,
            entityId || null,
            ipAddress || null
        ]);
    } catch (error) {
        console.error('Audit logging error:', error);
        // Don't fail the main operation if audit logging fails
    }
}

module.exports = {
    logAudit
};
