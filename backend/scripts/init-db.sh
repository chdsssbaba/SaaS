#!/bin/bash
# Database initialization script for Docker container

set -e

echo "Waiting for database to be ready..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✓ Database is ready"

echo "Running migrations..."
node /app/scripts/run-migrations.js

echo "Loading seed data..."
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f /app/seeds/seed_data.sql

echo "✓ Database initialization complete"

# Start the application
echo "Starting backend server..."
exec node /app/src/server.js
