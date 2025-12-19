const { pool } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/passwordHash');
const { generateToken } = require('../utils/jwtHelper');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

/**
 * POST /api/auth/register-tenant
 * Register new tenant with admin user
 */
async function registerTenant(req, res, next) {
    const client = await pool.connect();

    try {
        const { tenantName, subdomain, adminEmail, adminPassword, adminFullName } = req.body;

        // Validate required fields
        if (!tenantName || !subdomain || !adminEmail || !adminPassword || !adminFullName) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate password strength
        if (adminPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Validate subdomain format
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
            return res.status(400).json({
                success: false,
                message: 'Subdomain must be alphanumeric and lowercase'
            });
        }

        // Hash password
        const passwordHash = await hashPassword(adminPassword);

        // Start transaction
        await client.query('BEGIN');

        // Create tenant
        const tenantId = uuidv4();
        const tenantQuery = `
      INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects)
      VALUES ($1, $2, $3, 'active', 'free', 5, 3)
      RETURNING *
    `;
        const tenantResult = await client.query(tenantQuery, [tenantId, tenantName, subdomain]);
        const tenant = tenantResult.rows[0];

        // Create admin user
        const userId = uuidv4();
        const userQuery = `
      INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, 'tenant_admin', true)
      RETURNING id, email, full_name, role, tenant_id
    `;
        const userResult = await client.query(userQuery, [userId, tenantId, adminEmail, passwordHash, adminFullName]);
        const user = userResult.rows[0];

        // Commit transaction
        await client.query('COMMIT');

        // Log audit
        await logAudit({
            tenantId,
            userId,
            action: 'CREATE_TENANT',
            entityType: 'tenant',
            entityId: tenantId
        });

        res.status(201).json({
            success: true,
            message: 'Tenant registered successfully',
            data: {
                tenantId: tenant.id,
                subdomain: tenant.subdomain,
                adminUser: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role
                }
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
}

/**
 * POST /api/auth/login
 * User login with email, password, and tenant subdomain
 */
async function login(req, res, next) {
    try {
        const { email, password, tenantSubdomain } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        let user;
        let tenant;

        // Check if this is a super admin login (no subdomain needed)
        const superAdminQuery = `
      SELECT * FROM users 
      WHERE email = $1 AND role = 'super_admin' AND tenant_id IS NULL
    `;
        const superAdminResult = await pool.query(superAdminQuery, [email]);

        if (superAdminResult.rows.length > 0) {
            user = superAdminResult.rows[0];
        } else {
            // Regular user login - require subdomain
            if (!tenantSubdomain) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant subdomain is required'
                });
            }

            // Find tenant
            const tenantQuery = 'SELECT * FROM tenants WHERE subdomain = $1';
            const tenantResult = await pool.query(tenantQuery, [tenantSubdomain]);

            if (tenantResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Tenant not found'
                });
            }

            tenant = tenantResult.rows[0];

            // Check tenant status
            if (tenant.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Tenant account is suspended'
                });
            }

            // Find user in tenant
            const userQuery = `
        SELECT * FROM users 
        WHERE email = $1 AND tenant_id = $2
      `;
            const userResult = await pool.query(userQuery, [email, tenant.id]);

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            user = userResult.rows[0];
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            tenantId: user.tenant_id,
            role: user.role
        });

        // Log audit
        await logAudit({
            tenantId: user.tenant_id,
            userId: user.id,
            action: 'LOGIN',
            entityType: 'user',
            entityId: user.id
        });

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    tenantId: user.tenant_id
                },
                token,
                expiresIn: 86400 // 24 hours in seconds
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
async function getCurrentUser(req, res, next) {
    try {
        const { userId } = req.user;

        const query = `
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.tenant_id,
             t.id as tenant_id, t.name as tenant_name, t.subdomain, 
             t.subscription_plan, t.max_users, t.max_projects
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `;

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                isActive: user.is_active,
                tenant: user.tenant_id ? {
                    id: user.tenant_id,
                    name: user.tenant_name,
                    subdomain: user.subdomain,
                    subscriptionPlan: user.subscription_plan,
                    maxUsers: user.max_users,
                    maxProjects: user.max_projects
                } : null
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/logout
 * User logout
 */
async function logout(req, res, next) {
    try {
        // For JWT-only authentication, just return success
        // Client will remove token from storage

        // Log audit
        await logAudit({
            tenantId: req.user.tenantId,
            userId: req.user.userId,
            action: 'LOGOUT',
            entityType: 'user',
            entityId: req.user.userId
        });

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    registerTenant,
    login,
    getCurrentUser,
    logout
};
