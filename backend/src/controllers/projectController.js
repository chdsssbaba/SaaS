const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

// POST /api/projects - Create project
async function createProject(req, res, next) {
    try {
        const { name, description, status = 'active' } = req.body;
        const { userId, tenantId } = req.user;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Project name is required' });
        }

        // Check subscription limit
        const limitQuery = 'SELECT max_projects, (SELECT COUNT(*) FROM projects WHERE tenant_id = $1) as current_count FROM tenants WHERE id = $1';
        const limitResult = await pool.query(limitQuery, [tenantId]);
        const { max_projects, current_count } = limitResult.rows[0];

        if (parseInt(current_count) >= max_projects) {
            return res.status(403).json({ success: false, message: 'Subscription project limit reached' });
        }

        // Create project
        const projectId = uuidv4();
        const query = `
      INSERT INTO projects (id, tenant_id, name, description, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
        const result = await pool.query(query, [projectId, tenantId, name, description, status, userId]);
        const project = result.rows[0];

        await logAudit({ tenantId, userId, action: 'CREATE_PROJECT', entityType: 'project', entityId: projectId });

        res.status(201).json({
            success: true,
            data: {
                id: project.id,
                tenantId: project.tenant_id,
                name: project.name,
                description: project.description,
                status: project.status,
                createdBy: project.created_by,
                createdAt: project.created_at
            }
        });
    } catch (error) {
        next(error);
    }
}

// GET /api/projects - List projects
async function listProjects(req, res, next) {
    try {
        const { tenantId } = req.user;
        const { status, search, page = 1, limit = 20 } = req.query;

        const conditions = ['p.tenant_id = $1'];
        const values = [tenantId];
        let paramCount = 2;

        if (status) {
            conditions.push(`p.status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }

        if (search) {
            conditions.push(`p.name ILIKE $${paramCount}`);
            values.push(`%${search}%`);
            paramCount++;
        }

        const whereClause = conditions.join(' AND ');

        const countQuery = `SELECT COUNT(*) FROM projects p WHERE ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        values.push(parseInt(limit), offset);

        const query = `
      SELECT p.id, p.name, p.description, p.status, p.created_at,
             u.id as creator_id, u.full_name as creator_name,
             (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
             (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') as completed_task_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

        const result = await pool.query(query, values);
        const projects = result.rows.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            createdBy: { id: p.creator_id, fullName: p.creator_name },
            taskCount: parseInt(p.task_count),
            completedTaskCount: parseInt(p.completed_task_count),
            createdAt: p.created_at
        }));

        res.status(200).json({
            success: true,
            data: {
                projects,
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

// GET /api/projects/:projectId - Get project by ID
async function getProjectById(req, res, next) {
    try {
        const { projectId } = req.params;
        const { tenantId } = req.user;

        const query = `
      SELECT p.id, p.name, p.description, p.status, p.created_at, p.updated_at,
             u.id as creator_id, u.full_name as creator_name,
             (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
             (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') as completed_task_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1 AND p.tenant_id = $2
    `;

        const result = await pool.query(query, [projectId, tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const project = result.rows[0];

        res.status(200).json({
            success: true,
            data: {
                id: project.id,
                name: project.name,
                description: project.description,
                status: project.status,
                createdBy: { id: project.creator_id, fullName: project.creator_name },
                taskCount: parseInt(project.task_count),
                completedTaskCount: parseInt(project.completed_task_count),
                createdAt: project.created_at,
                updatedAt: project.updated_at
            }
        });
    } catch (error) {
        next(error);
    }
}

// PUT /api/projects/:projectId - Update project
async function updateProject(req, res, next) {
    try {
        const { projectId } = req.params;
        const { name, description, status } = req.body;
        const { userId, role, tenantId } = req.user;

        // Get project
        const projectQuery = 'SELECT * FROM projects WHERE id = $1';
        const projectResult = await pool.query(projectQuery, [projectId]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const project = projectResult.rows[0];

        // Must be same tenant
        if (project.tenant_id !== tenantId) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Must be tenant_admin or creator
        if (role !== 'tenant_admin' && project.created_by !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Build update
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (status) {
            updates.push(`status = $${paramCount++}`);
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        values.push(projectId);
        const query = `UPDATE projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
        const result = await pool.query(query, values);
        const updatedProject = result.rows[0];

        await logAudit({ tenantId, userId, action: 'UPDATE_PROJECT', entityType: 'project', entityId: projectId });

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: {
                id: updatedProject.id,
                name: updatedProject.name,
                description: updatedProject.description,
                status: updatedProject.status,
                updatedAt: updatedProject.updated_at
            }
        });
    } catch (error) {
        next(error);
    }
}

// DELETE /api/projects/:projectId - Delete project
async function deleteProject(req, res, next) {
    try {
        const { projectId } = req.params;
        const { userId, role, tenantId } = req.user;

        // Get project
        const projectQuery = 'SELECT * FROM projects WHERE id = $1';
        const projectResult = await pool.query(projectQuery, [projectId]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const project = projectResult.rows[0];

        // Must be same tenant
        if (project.tenant_id !== tenantId) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Must be tenant_admin or creator
        if (role !== 'tenant_admin' && project.created_by !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Delete project (cascade will delete tasks)
        await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);

        await logAudit({ tenantId, userId, action: 'DELETE_PROJECT', entityType: 'project', entityId: projectId });

        res.status(200).json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        next(error);
    }
}

module.exports = { createProject, listProjects, getProjectById, updateProject, deleteProject };
