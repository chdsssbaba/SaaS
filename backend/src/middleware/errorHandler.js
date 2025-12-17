/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';

    // Handle specific error types
    if (err.code === '23505') { // Postgres unique constraint violation
        statusCode = 409;
        message = 'Resource already exists';

        if (err.constraint === 'tenants_subdomain_key') {
            message = 'Subdomain already taken';
        } else if (err.constraint === 'unique_email_per_tenant') {
            message = 'Email already exists in this tenant';
        }
    }

    if (err.code === '23503') { // Postgres foreign key violation
        statusCode = 400;
        message = 'Invalid reference to related resource';
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

module.exports = errorHandler;
