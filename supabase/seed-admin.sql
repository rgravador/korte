-- Seed a system_admin user for Court Books.
-- Run this AFTER schema.sql has been applied.
--
-- This creates:
--   1. A system tenant (for platform-level admin)
--   2. A system_admin user with username 'admin' and password 'admin123'
--
-- Change the password after first login.

-- 1. Create system tenant (if not exists)
INSERT INTO tenants (id, name, subdomain)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Court Books System',
  'system'
)
ON CONFLICT (subdomain) DO NOTHING;

-- 2. Create system_admin user
-- Password: admin123 (hashed with bcrypt via pgcrypto)
INSERT INTO users (tenant_id, username, password_hash, role, display_name, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  crypt('admin123', gen_salt('bf', 10)),
  'system_admin',
  'System Admin',
  'admin@courtbooks.app'
)
ON CONFLICT (tenant_id, username) DO NOTHING;
