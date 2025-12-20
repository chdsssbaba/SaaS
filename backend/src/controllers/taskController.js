const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

// POST /api/projects/:projectId/tasks - Create task
async function createTask(req, res, next) {
    try {
        const { projectId } = req.params;
        const { title, description, assignedTo, priority = 'medium', dueDate } = req.body;
        const { userId, tenantId } = req.user;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Task title is required' });
        }

        // Verify project exists and belongs to user's tenant
        const projectQuery = 'SELECT * FROM projects WHERE id = $1';
        const projectResult = await pool.query(projectQuery, [projectId]);

        if (projectResult.rows.length === 0 || projectResult.rows[0].tenant_id !== tenantId) {
            return res.status(403).json({ success: false, message: 'Project not found' });
        }

        // If assignedTo provided, verify user belongs to same tenant
        if (assignedTo) {
            const userQuery = 'SELECT * FROM users WHERE id = $1';
            const userResult = await pool.query(userQuery, [assignedTo]);

            if (userResult.rows.length === 0 || userResult.rows[0].tenant_id !== tenantId) {
                return res.status(400).json({ success: false, message: 'Assigned user must belong to same tenant' });
            }
        }

        // Create task
        const taskId = uuidv4();
        const query = `
      INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date)
      VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7, $8)
      RETURNING *
    `;
        const result = await pool.query(query, [taskId, projectId, tenantId, title, description, priority, assignedTo || null, dueDate || null]);
        const task = result.rows[0];

        await logAudit({ tenantId, userId, action: 'CREATE_TASK', entityType: 'task', entityId: taskId });

        res.status(201).json({
            success: true,
            data: {
                id: task.id,
                projectId: task.project_id,
                tenantId: task.tenant_id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assignedTo: task.assigned_to,
                dueDate: task.due_date,
                createdAt: task.created_at
            }
        });
    } catch (error) {
        next(error);
    }
}

// GET /api/projects/:projectId/tasks - List tasks
async function listTasks(req, res, next) {
    try {
        const { projectId } = req.params;
        const { tenantId } = req.user;
        const { status, assignedTo, priority, search, page = 1, limit = 50 } = req.query;

        // Verify project belongs to tenant
        const projectQuery = 'SELECT * FROM projects WHERE id = $1';
        const projectResult = await pool.query(projectQuery, [projectId]);

        if (projectResult.rows.length === 0 || projectResult.rows[0].tenant_id !== tenantId) {
            return res.status(403).json({ success: false, message: 'Project not found' });
        }

        // Build query
        const conditions = ['t.project_id = $1'];
        const values = [projectId];
        let paramCount = 2;

        if (status) {
            conditions.push(`t.status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }

        if (assignedTo) {
            conditions.push(`t.assigned_to = $${paramCount}`);
            values.push(assignedTo);
            paramCount++;
        }

        if (priority) {
            conditions.push(`t.priority = $${paramCount}`);
            values.push(priority);
            paramCount++;
        }

        if (search) {
            conditions.push(`t.title ILIKE $${paramCount}`);
            values.push(`%${search}%`);
            paramCount++;
        }

        const whereClause = conditions.join(' AND ');

        const countQuery = `SELECT COUNT(*) FROM tasks t WHERE ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        values.push(parseInt(limit), offset);

        const query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at,
             u.id as assigned_user_id, u.full_name as assigned_user_name, u.email as assigned_user_email
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE ${whereClause}
      ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        t.due_date ASC NULLS LAST
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

        const result = await pool.query(query, values);
        const tasks = result.rows.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            assignedTo: t.assigned_user_id ? {
                id: t.assigned_user_id,
                fullName: t.assigned_user_name,
                email: t.assigned_user_email
            } : null,
            dueDate: t.due_date,
            createdAt: t.created_at
        }));

        res.status(200).json({
            success: true,
            data: {
                tasks,
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

// PATCH /api/tasks/:taskId/status - Update task status
async function updateTaskStatus(req, res, next) {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        const { tenantId } = req.user;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        // Verify task belongs to tenant
        const taskQuery = 'SELECT * FROM tasks WHERE id = $1';
        const taskResult = await pool.query(taskQuery, [taskId]);

        if (taskResult.rows.length === 0 || taskResult.rows[0].tenant_id !== tenantId) {
            return res.status(403).json({ success: false, message: 'Task not found' });
        }

        // Update status only
        const query = 'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
        const result = await pool.query(query, [status, taskId]);
        const task = result.rows[0];

        res.status(200).json({
            success: true,
            data: {
                id: task.id,
                status: task.status,
                updatedAt: task.updated_at
            }
        });
    } catch (error) {
        next(error);
    }
}

// PUT /api/tasks/:taskId - Update task
async function updateTask(req, res, next) {
    try {
        const { taskId } = req.params;
        const { title, description, status, priority, assignedTo, dueDate } = req.body;
        const { userId, tenantId } = req.user;

        // Verify task belongs to tenant
        const taskQuery = 'SELECT * FROM tasks WHERE id = $1';
        const taskResult = await pool.query(taskQuery, [taskId]);

        if (taskResult.rows.length === 0 || taskResult.rows[0].tenant_id !== tenantId) {
            return res.status(403).json({ success: false, message: 'Task not found' });
        }

        // If assignedTo provided, verify user belongs to same tenant
        if (assignedTo) {
            const userQuery = 'SELECT * FROM users WHERE id = $1';
            const userResult = await pool.query(userQuery, [assignedTo]);

            if (userResult.rows.length === 0 || userResult.rows[0].tenant_id !== tenantId) {
                return res.status(400).json({ success: false, message: 'Assigned user must belong to same tenant' });
            }
        }

        // Build update
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (title) {
            updates.push(`title = $${paramCount++}`);
            values.push(title);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (status) {
            updates.push(`status = $${paramCount++}`);
            values.push(status);
        }
        if (priority) {
            updates.push(`priority = $${paramCount++}`);
            values.push(priority);
        }
        if (assignedTo !== undefined) {
            updates.push(`assigned_to = $${paramCount++}`);
            values.push(assignedTo);
        }
        if (dueDate !== undefined) {
            updates.push(`due_date = $${paramCount++}`);
            values.push(dueDate);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        values.push(taskId);
        const query = `UPDATE tasks SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
        const result = await pool.query(query, values);
        const task = result.rows[0];

        await logAudit({ tenantId, userId, action: 'UPDATE_TASK', entityType: 'task', entityId: taskId });

        // Get assigned user info
        let assignedUser = null;
        if (task.assigned_to) {
            const userQuery = 'SELECT id, full_name, email FROM users WHERE id = $1';
            const userResult = await pool.query(userQuery, [task.assigned_to]);
            if (userResult.rows.length > 0) {
                const u = userResult.rows[0];
                assignedUser = { id: u.id, fullName: u.full_name, email: u.email };
            }
        }

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: {
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assignedTo: assignedUser,
                dueDate: task.due_date,
                updatedAt: task.updated_at
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { createTask, listTasks, updateTaskStatus, updateTask };
