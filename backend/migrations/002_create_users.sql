-- Migration: Create users table
-- Description: Stores user accounts with tenant association and role-based access

DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('super_admin', 'tenant_admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role_type NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Email must be unique per tenant (but can exist across different tenants)
    CONSTRAINT unique_email_per_tenant UNIQUE(tenant_id, email)
);

-- Create indexes for performance
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
END $$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment to clarify super_admin tenant_id is NULL
COMMENT ON COLUMN users.tenant_id IS 'Foreign key to tenants. NULL for super_admin users';
