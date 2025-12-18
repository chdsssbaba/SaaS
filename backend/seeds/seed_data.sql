-- Seed Data for Multi-Tenant SaaS Platform
-- This file contains initial data for testing and evaluation

-- Note: Password hashes are for the following passwords (bcrypt with cost 10):
-- Super Admin: Admin@123
-- Tenant Admin (demo): Demo@123
-- Users: User@123

-- 1. Insert Super Admin User (no tenant association)
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'superadmin@system.com', '$2b$10$cLb48Xsfpfdz.EJoX6mhPOdKgUizR2YrboGVqFazDaGd/H5o4h.5m', 'Super Administrator', 'super_admin', true);

-- 2. Insert Demo Tenant (Organization)
INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects) VALUES
('11111111-1111-1111-1111-111111111111', 'Demo Company', 'demo', 'active', 'pro', 25, 15);

-- 3. Insert Tenant Admin for Demo Company
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@demo.com', '$2b$10$/.RsjGczvh6/J2b.8Ql63ueSiGtL407/TRxETNoSV0WoVifxD3N/O', 'Demo Admin', 'tenant_admin', true);

-- 4. Insert Regular Users for Demo Company
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user1@demo.com', '$2b$10$rneRPCH/AE6cXss.FBs17.Sv2Kf7Z0Y1tIwPhp.cF8JQ3AQXYEXGu', 'John Smith', 'user', true),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'user2@demo.com', '$2b$10$rneRPCH/AE6cXss.FBs17.Sv2Kf7Z0Y1tIwPhp.cF8JQ3AQXYEXGu', 'Jane Doe', 'user', true);

-- 5. Insert Sample Projects for Demo Company
INSERT INTO projects (id, tenant_id, name, description, status, created_by) VALUES
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Website Redesign', 'Complete redesign of company website with modern UI/UX', 'active', '22222222-2222-2222-2222-222222222222'),
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Mobile App Development', 'Native iOS and Android mobile application', 'active', '22222222-2222-2222-2222-222222222222');

-- 6. Insert Sample Tasks for Projects
INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date) VALUES
-- Tasks for Website Redesign project
('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Create wireframes', 'Design wireframes for all major pages', 'completed', 'high', '33333333-3333-3333-3333-333333333333', '2026-01-15'),
('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Design homepage mockup', 'High-fidelity design for homepage', 'in_progress', 'high', '33333333-3333-3333-3333-333333333333', '2026-01-20'),
('99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Implement responsive navigation', 'Code responsive navigation bar', 'todo', 'medium', '44444444-4444-4444-4444-444444444444', '2026-01-25'),

-- Tasks for Mobile App Development project
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Setup development environment', 'Configure React Native and dependencies', 'completed', 'high', '44444444-4444-4444-4444-444444444444', '2026-01-10'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Design app architecture', 'Plan component structure and state management', 'todo', 'high', '33333333-3333-3333-3333-333333333333', '2026-02-01');

-- 7. Insert Audit Logs for tracking
INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'CREATE_PROJECT', 'project', '55555555-5555-5555-5555-555555555555'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'CREATE_PROJECT', 'project', '66666666-6666-6666-6666-666666666666'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'CREATE_USER', 'user', '33333333-3333-3333-3333-333333333333'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'CREATE_USER', 'user', '44444444-4444-4444-4444-444444444444');

-- Success message
SELECT 'Seed data loaded successfully!' AS status;
SELECT 'Super Admin: superadmin@system.com / Admin@123' AS credentials;
SELECT 'Demo Admin: admin@demo.com / Demo@123' AS credentials;
SELECT 'Demo Users: user1@demo.com, user2@demo.com / User@123' AS credentials;
