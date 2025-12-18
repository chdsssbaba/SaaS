const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function runMigrations() {
    console.log('Starting database migrations...');

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    for (const file of migrationFiles) {
        if (!file.endsWith('.sql')) continue;

        console.log(`Running migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
            await pool.query(sql);
            console.log(`✓ Completed: ${file}`);
        } catch (error) {
            console.error(`✗ Failed: ${file}`);
            console.error(error.message);
            process.exit(1);
        }
    }

    console.log('✓ All migrations completed successfully');
    process.exit(0);
}

runMigrations().catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
});
