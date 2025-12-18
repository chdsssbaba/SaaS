const bcrypt = require('bcrypt');
const { pool } = require('./src/config/database');

async function updatePasswords() {
    try {
        // Generate hashes
        const adminHash = await bcrypt.hash('Demo@123', 10);
        const userHash = await bcrypt.hash('User@123', 10);
        const superAdminHash = await bcrypt.hash('Admin@123', 10);

        console.log('Generated password hashes');

        // Update passwords
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [adminHash, 'admin@demo.com']);
        console.log('✓ Updated admin@demo.com password');

        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [userHash, 'user1@demo.com']);
        console.log('✓ Updated user1@demo.com password');

        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [userHash, 'user2@demo.com']);
        console.log('✓ Updated user2@demo.com password');

        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [superAdminHash, 'superadmin@system.com']);
        console.log('✓ Updated superadmin@system.com password');

        console.log('\nAll passwords updated successfully!');
        console.log('Credentials:');
        console.log('- admin@demo.com / Demo@123 (tenant: demo)');
        console.log('- user1@demo.com / User@123 (tenant: demo)');
        console.log('- user2@demo.com / User@123 (tenant: demo)');
        console.log('- superadmin@system.com / Admin@123');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updatePasswords();
