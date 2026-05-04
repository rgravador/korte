-- Court Books — Full Schema
-- Run this file against your Supabase SQL editor.
-- Safe to re-run: every object uses DROP IF EXISTS / CREATE OR REPLACE.

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Custom types
-- ============================================================
DO $$ BEGIN
  DROP TYPE IF EXISTS user_role CASCADE;
  CREATE TYPE user_role AS ENUM ('system_admin', 'tenant_admin', 'tenant_staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP TYPE IF EXISTS booking_status CASCADE;
  CREATE TYPE booking_status AS ENUM ('confirmed', 'pending', 'checked_in', 'no_show', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP TYPE IF EXISTS item_type CASCADE;
  CREATE TYPE item_type AS ENUM ('rental', 'sale');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP TYPE IF EXISTS member_tier CASCADE;
  CREATE TYPE member_tier AS ENUM ('regular', 'vip');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Tables
-- ============================================================

DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS courts CASCADE;
DROP TABLE IF EXISTS sports CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

CREATE TABLE tenants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  subdomain      TEXT NOT NULL UNIQUE,
  court_count    INT NOT NULL DEFAULT 0,
  operating_hours_start INT NOT NULL DEFAULT 6,
  operating_hours_end   INT NOT NULL DEFAULT 22,
  free_trial_days INT NOT NULL DEFAULT 7,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username       TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           user_role NOT NULL DEFAULT 'tenant_staff',
  display_name   TEXT NOT NULL,
  email          TEXT NOT NULL DEFAULT '',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, username)
);

CREATE TABLE sports (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  operating_hours_ranges JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sport_id       UUID REFERENCES sports(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  hourly_rate    NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sport_id       UUID REFERENCES sports(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  type           item_type NOT NULL DEFAULT 'rental',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  phone          TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  tier           member_tier NOT NULL DEFAULT 'regular',
  total_bookings INT NOT NULL DEFAULT 0,
  total_no_shows INT NOT NULL DEFAULT 0,
  last_visit     DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  court_id         UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  member_id        UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name      TEXT NOT NULL DEFAULT 'Walk-in',
  date             DATE NOT NULL,
  start_hour       INT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  status           booking_status NOT NULL DEFAULT 'pending',
  court_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
  items_total      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_recurring     BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE booking_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_id        UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  item_name      TEXT NOT NULL,
  item_type      item_type NOT NULL,
  unit_price     NUMERIC(10,2) NOT NULL,
  quantity       INT NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_tenant          ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sports_tenant         ON sports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_courts_tenant         ON courts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_courts_sport          ON courts(sport_id);
CREATE INDEX IF NOT EXISTS idx_items_tenant          ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_sport           ON items(sport_id);
CREATE INDEX IF NOT EXISTS idx_members_tenant        ON members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant       ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date         ON bookings(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date   ON bookings(court_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_member       ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);

-- ============================================================
-- Grants — least-privilege per role
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- anon: read-only on tenants (subdomain lookup for login page)
GRANT SELECT ON tenants TO anon;

-- authenticated: standard CRUD scoped by RLS policies below
GRANT SELECT, INSERT, UPDATE ON tenants       TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON courts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON items  TO authenticated;
GRANT SELECT, INSERT, UPDATE ON members        TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings       TO authenticated;
GRANT SELECT, INSERT ON booking_items          TO authenticated;

-- ============================================================
-- Row-Level Security — tenant isolation (defense-in-depth)
-- Primary enforcement is the JWT session in the API layer.
-- These policies protect against direct anon/authenticated key usage.
-- The service_role key used by API routes bypasses RLS.
-- ============================================================

-- Helper functions
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_tenant_id', true), ''),
    '00000000-0000-0000-0000-000000000000'
  )::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO authenticated;

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies (all operations scoped to current_tenant_id())
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation ON sports
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation ON courts
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation ON items
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation ON members
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation ON bookings
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation ON booking_items
  USING (booking_id IN (SELECT id FROM bookings WHERE tenant_id = current_tenant_id()));

-- ============================================================
-- Helper functions: password hashing
-- ============================================================
CREATE OR REPLACE FUNCTION hash_password(plain TEXT) RETURNS TEXT AS $$
  SELECT crypt(plain, gen_salt('bf', 10));
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION verify_password(plain TEXT, hashed TEXT) RETURNS BOOLEAN AS $$
  SELECT hashed = crypt(plain, hashed);
$$ LANGUAGE sql;

-- Password functions restricted to authenticated role only (called via service_role in API routes)
GRANT EXECUTE ON FUNCTION hash_password(TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO authenticated;

-- ============================================================
-- Trigger: auto-update updated_at on users
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Trigger: auto-update tenant court_count
-- ============================================================
CREATE OR REPLACE FUNCTION update_court_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tenants SET court_count = (
      SELECT COUNT(*) FROM courts WHERE tenant_id = NEW.tenant_id AND is_active = true
    ) WHERE id = NEW.tenant_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tenants SET court_count = (
      SELECT COUNT(*) FROM courts WHERE tenant_id = OLD.tenant_id AND is_active = true
    ) WHERE id = OLD.tenant_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE tenants SET court_count = (
      SELECT COUNT(*) FROM courts WHERE tenant_id = NEW.tenant_id AND is_active = true
    ) WHERE id = NEW.tenant_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS courts_count_trigger ON courts;
CREATE TRIGGER courts_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON courts
  FOR EACH ROW EXECUTE FUNCTION update_court_count();
