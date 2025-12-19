const { pool } = require('../config/database');
const { hashPassword } = require('../utils/passwordHash');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

// POST /api/tenants/:tenantId/users - Add user to tenant
async function addUser(req, res, next) {
    try {
        const { tenantId } = req.params;
        const { email, password, fullName, role = 'user' } = req.body;
        const { userId, role: userRole, tenantId: userTenantId } = req.user;

        // Only tenant_admin can add users
        if (userRole !== 'tenant_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Must be admin of this tenant
        if (userTenantId !== tenantId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Validate fields
        if (!email || !password || !fullName) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        // Check subscription limit
        const limitQuery = 'SELECT max_users, (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as current_count FROM tenants WHERE id = $1';
        const limitResult = await pool.query(limitQuery, [tenantId]);
        const { max_users, current_count } = limitResult.rows[0];

        if (parseInt(current_count) >= max_users) {
            return res.status(403).json({ success: false, message: 'Subscription user limit reached' });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const newUserId = uuidv4();
        const query = `
      INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, email, full_name, role, tenant_id, is_active, created_at
    `;
        const result = await pool.query(query, [newUserId, tenantId, email, passwordHash, fullName, role]);
        const user = result.rows[0];

        await logAudit({ tenantId, userId, action: 'CREATE_USER', entityType: 'user', entityId: newUserId });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                tenantId: user.tenant_id,
                isActive: user.is_active,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        next(error);
    }
}

// GET /api/tenants/:tenantId/users - List users in tenant
async function listUsers(req, res, next) {
    try {
        const { tenantId } = req.params;
        const { tenantId: userTenantId } = req.user;
        const { search, role, page = 1, limit = 50 } = req.query;

        // Must belong to this tenant
        if (userTenantId !== tenantId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Build query
        const conditions = ['tenant_id = $1'];
        const values = [tenantId];
        let paramCount = 2;

        if (search) {
            conditions.push(`(full_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
            values.push(`%${search}%`);
            paramCount++;
        }

        if (role) {
            conditions.push(`role = $${paramCount}`);
            values.push(role);
            paramCount++;
        }

        const whereClause = conditions.join(' AND ');

        const countQuery = `SELECT COUNT(*) FROM users WHERE ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        values.push(parseInt(limit), offset);

        const query = `
      SELECT id, email, full_name, role, is_active, created_at
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

        const result = await pool.query(query, values);
        const users = result.rows.map(u => ({
            id: u.id,
            email: u.email,
            fullName: u.full_name,
            role: u.role,
            isActive: u.is_active,
            createdAt: u.created_at
        }));

        res.status(200).json({
            success: true,
            data: {
                users,
                total,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

// PUT /api/users/:userId - Update user
async function updateUser(req, res, next) {
    try {
        const { userId: targetUserId } = req.params;
        const { fullName, role, isActive } = req.body;
        const { userId, role: userRole, tenantId } = req.user;

        // Get target user
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [targetUserId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const targetUser = userResult.rows[0];

        // Must be same tenant
        if (targetUser.tenant_id !== tenantId && userRole !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Users can update their own fullName
        if (userId === targetUserId) {
            if (!fullName) {
                return res.status(400).json({ success: false, message: 'No valid fields to update' });
            }

            const query = 'UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
            const result = await pool.query(query, [fullName, targetUserId]);
            const user = result.rows[0];

            return res.status(200).json({
                success: true,
                message: 'User updated successfully',
                data: { id: user.id, fullName: user.full_name, updatedAt: user.updated_at }
            });
        }

        // Only tenant_admin can update others
        if (userRole !== 'tenant_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Build update
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (fullName) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(fullName);
        }
        if (role) {
            updates.push(`role = $${paramCount++}`);
            values.push(role);
        }
        if (isActive !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(isActive);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        values.push(targetUserId);
        const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
        const result = await pool.query(query, values);
        const user = result.rows[0];

        await logAudit({ tenantId, userId, action: 'UPDATE_USER', entityType: 'user', entityId: targetUserId });

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: { id: user.id, fullName: user.full_name, role: user.role, updatedAt: user.updated_at }
        });
    } catch (error) {
        next(error);
    }
}

// DELETE /api/users/:userId - Delete user
async function deleteUser(req, res, next) {
    try {
        const { userId: targetUserId } = req.params;
        const { userId, role, tenantId } = req.user;

        // Cannot delete self
        if (userId === targetUserId) {
            return res.status(403).json({ success: false, message: 'Cannot delete yourself' });
        }

        // Only tenant_admin can delete
        if (role !== 'tenant_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Verify user exists and belongs to same tenant
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [targetUserId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (userResult.rows[0].tenant_id !== tenantId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Delete user (cascade will handle tasks)
        await pool.query('DELETE FROM users WHERE id = $1', [targetUserId]);

        await logAudit({ tenantId, userId, action: 'DELETE_USER', entityType: 'user', entityId: targetUserId });

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
}

// GET /api/users - List all users (super_admin only)
async function listAllUsers(req, res, next) {
    try {
        const { role } = req.user;
        const { search, role: roleFilter, tenantId, page = 1, limit = 50 } = req.query;

        // Only super_admin can list all users
        if (role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Build query
        const conditions = [];
        const values = [];
        let paramCount = 1;

        if (tenantId) {
            conditions.push(`u.tenant_id = $${paramCount++}`);
            values.push(tenantId);
        }

        if (search) {
            conditions.push(`(u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
            values.push(`%${search}%`);
            paramCount++;
        }

        if (roleFilter) {
            conditions.push(`u.role = $${paramCount++}`);
            values.push(roleFilter);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        values.push(parseInt(limit), offset);

        const query = `
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at, u.tenant_id,
             t.name as tenant_name, t.subdomain as tenant_subdomain
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

        const result = await pool.query(query, values);
        const users = result.rows.map(u => ({
            id: u.id,
            email: u.email,
            fullName: u.full_name,
            role: u.role,
            isActive: u.is_active,
            createdAt: u.created_at,
            tenantId: u.tenant_id,
            tenant: u.tenant_id ? {
                name: u.tenant_name,
                subdomain: u.tenant_subdomain
            } : null
        }));

        res.status(200).json({
            success: true,
            data: {
                users,
                total,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { addUser, listUsers, updateUser, deleteUser, listAllUsers };
