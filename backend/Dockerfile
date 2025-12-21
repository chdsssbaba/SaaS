# Backend Dockerfile
FROM node:18-slim

# Install PostgreSQL client for init script and curl for health checks
RUN apt-get update && apt-get install -y postgresql-client curl && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Make init script executable
RUN chmod +x /app/scripts/init-db.sh

# Expose port
EXPOSE 5000

# Use init script as entrypoint
ENTRYPOINT ["/app/scripts/init-db.sh"]
