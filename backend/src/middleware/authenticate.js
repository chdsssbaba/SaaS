const { verifyToken } = require('../utils/jwtHelper');

/**
 * Authentication middleware - verifies JWT token
 * Attaches user info to req.user: {userId, tenantId, role}
 */
function authenticate(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please provide a valid token.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = verifyToken(token);

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            role: decoded.role
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
}

module.exports = authenticate;
