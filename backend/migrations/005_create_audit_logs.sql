-- Migration: Create audit_logs table
-- Description: Tracks all important actions for security and compliance

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
END $$;

-- Add comments
COMMENT ON COLUMN audit_logs.tenant_id IS 'NULL for super_admin actions affecting all tenants';
COMMENT ON COLUMN audit_logs.user_id IS 'NULL for system-generated actions';
COMMENT ON COLUMN audit_logs.action IS 'Action type: CREATE_USER, DELETE_PROJECT, LOGIN, etc.';
