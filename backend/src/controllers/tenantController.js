const { pool } = require('../config/database');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/tenants/:tenantId
 * Get tenant details with stats
 */
async function getTenantDetails(req, res, next) {
    try {
        const { tenantId } = req.params;
        const { userId, role, tenantId: userTenantId } = req.user;

        // Authorization: must be super_admin or belong to this tenant
        if (role !== 'super_admin' && userTenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden'
            });
        }

        // Get tenant info
        const tenantQuery = 'SELECT * FROM tenants WHERE id = $1';
        const tenantResult = await pool.query(tenantQuery, [tenantId]);

        if (tenantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const tenant = tenantResult.rows[0];

        // Get stats
        const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as total_users,
        (SELECT COUNT(*) FROM projects WHERE tenant_id = $1) as total_projects,
        (SELECT COUNT(*) FROM tasks WHERE tenant_id = $1) as total_tasks
    `;
        const statsResult = await pool.query(statsQuery, [tenantId]);
        const stats = statsResult.rows[0];

        res.status(200).json({
            success: true,
            data: {
                id: tenant.id,
                name: tenant.name,
                subdomain: tenant.subdomain,
                status: tenant.status,
                subscriptionPlan: tenant.subscription_plan,
                maxUsers: tenant.max_users,
                maxProjects: tenant.max_projects,
                createdAt: tenant.created_at,
                stats: {
                    totalUsers: parseInt(stats.total_users),
                    totalProjects: parseInt(stats.total_projects),
                    totalTasks: parseInt(stats.total_tasks)
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/tenants/:tenantId
 * Update tenant details
 */
async function updateTenant(req, res, next) {
    try {
        const { tenantId } = req.params;
        const { name, status, subscriptionPlan, maxUsers, maxProjects } = req.body;
        const { role, tenantId: userTenantId, userId } = req.user;

        // Tenant admins can only update name
        if (role === 'tenant_admin') {
            if (status || subscriptionPlan || maxUsers || maxProjects) {
                return res.status(403).json({
                    success: false,
                    message: 'Tenant admins can only update tenant name'
                });
            }

            if (userTenantId !== tenantId) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden'
                });
            }
        }

        // Super admins can update everything
        if (role !== 'super_admin' && role !== 'tenant_admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden'
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }

        if (role === 'super_admin') {
            if (status) {
                updates.push(`status = $${paramCount++}`);
                values.push(status);
            }
            if (subscriptionPlan) {
                updates.push(`subscription_plan = $${paramCount++}`);
                values.push(subscriptionPlan);

                // Update limits based on plan
                const limits = {
                    free: { maxUsers: 5, maxProjects: 3 },
                    pro: { maxUsers: 25, maxProjects: 15 },
                    enterprise: { maxUsers: 100, maxProjects: 50 }
                };

                if (limits[subscriptionPlan]) {
                    updates.push(`max_users = $${paramCount++}`);
                    values.push(limits[subscriptionPlan].maxUsers);
                    updates.push(`max_projects = $${paramCount++}`);
                    values.push(limits[subscriptionPlan].maxProjects);
                }
            }
            if (maxUsers !== undefined) {
                updates.push(`max_users = $${paramCount++}`);
                values.push(maxUsers);
            }
            if (maxProjects !== undefined) {
                updates.push(`max_projects = $${paramCount++}`);
                values.push(maxProjects);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        values.push(tenantId);
        const query = `
      UPDATE tenants 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const tenant = result.rows[0];

        // Log audit
        await logAudit({
            tenantId,
            userId,
            action: 'UPDATE_TENANT',
            entityType: 'tenant',
            entityId: tenantId
        });

        res.status(200).json({
            success: true,
            message: 'Tenant updated successfully',
            data: {
                id: tenant.id,
                name: tenant.name,
                updatedAt: tenant.updated_at
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/tenants
 * List all tenants (super_admin only)
 */
async function listTenants(req, res, next) {
    try {
        const { role } = req.user;

        // Only super_admin can list all tenants
        if (role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. Super admin access required.'
            });
        }

        const { page = 1, limit = 10, status, subscriptionPlan } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build where clause
        const conditions = [];
        const values = [];
        let paramCount = 1;

        if (status) {
            conditions.push(`status = $${paramCount++}`);
            values.push(status);
        }

        if (subscriptionPlan) {
            conditions.push(`subscription_plan = $${paramCount++}`);
            values.push(subscriptionPlan);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM tenants ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const totalTenants = parseInt(countResult.rows[0].count);

        // Get tenants with stats
        values.push(parseInt(limit), offset);
        const tenantsQuery = `
      SELECT t.id, t.name, t.subdomain, t.status, t.subscription_plan, t.max_users, t.max_projects, t.created_at,
             (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as total_users,
             (SELECT COUNT(*) FROM projects WHERE tenant_id = t.id) as total_projects
      FROM tenants t
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

        const tenantsResult = await pool.query(tenantsQuery, values);

        const tenants = tenantsResult.rows.map(t => ({
            id: t.id,
            name: t.name,
            subdomain: t.subdomain,
            status: t.status,
            subscriptionPlan: t.subscription_plan,
            maxUsers: t.max_users,
            maxProjects: t.max_projects,
            createdAt: t.created_at,
            stats: {
                totalUsers: parseInt(t.total_users),
                totalProjects: parseInt(t.total_projects)
            }
        }));

        res.status(200).json({
            success: true,
            data: {
                tenants,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalTenants / parseInt(limit)),
                    totalTenants,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getTenantDetails,
    updateTenant,
    listTenants
};
