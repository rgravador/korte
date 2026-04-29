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
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

CREATE TABLE tenants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  subdomain      TEXT NOT NULL UNIQUE,
  court_count    INT NOT NULL DEFAULT 0,
  operating_hours_start INT NOT NULL DEFAULT 6,
  operating_hours_end   INT NOT NULL DEFAULT 22,
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

CREATE TABLE courts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  hourly_rate    NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_courts_tenant         ON courts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_tenant          ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_members_tenant        ON members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant       ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date         ON bookings(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date   ON bookings(court_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_member       ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);

-- ============================================================
-- Grants — allow anon and authenticated roles to use tables + functions
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT ALL ON tenants       TO anon, authenticated;
GRANT ALL ON users         TO anon, authenticated;
GRANT ALL ON courts        TO anon, authenticated;
GRANT ALL ON items         TO anon, authenticated;
GRANT ALL ON members       TO anon, authenticated;
GRANT ALL ON bookings      TO anon, authenticated;
GRANT ALL ON booking_items TO anon, authenticated;

-- ============================================================
-- Row-Level Security
-- ============================================================

-- Helper: read tenant_id from a session variable set per-request
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_tenant_id', true), ''),
    '00000000-0000-0000-0000-000000000000'
  )::UUID;
$$ LANGUAGE sql STABLE;

-- RPC function to set tenant context (callable from Supabase JS client)
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO anon, authenticated;

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;

-- ── Tenants ──────────────────────────────────────────────────
-- SELECT/UPDATE/DELETE: only own tenant
DROP POLICY IF EXISTS tenants_select ON tenants;
CREATE POLICY tenants_select ON tenants
  FOR SELECT USING (id = current_tenant_id());

DROP POLICY IF EXISTS tenants_update ON tenants;
CREATE POLICY tenants_update ON tenants
  FOR UPDATE USING (id = current_tenant_id());

-- INSERT: allow creating new tenants (no tenant context yet)
DROP POLICY IF EXISTS tenants_insert ON tenants;
CREATE POLICY tenants_insert ON tenants
  FOR INSERT WITH CHECK (true);

-- ── Users ────────────────────────────────────────────────────
-- SELECT: allow without tenant context for login (match by username)
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    OR current_tenant_id() = '00000000-0000-0000-0000-000000000000'::UUID
  );

DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users
  FOR UPDATE USING (tenant_id = current_tenant_id());

-- ── Courts ───────────────────────────────────────────────────
DROP POLICY IF EXISTS courts_select ON courts;
CREATE POLICY courts_select ON courts
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS courts_insert ON courts;
CREATE POLICY courts_insert ON courts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS courts_update ON courts;
CREATE POLICY courts_update ON courts
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS courts_delete ON courts;
CREATE POLICY courts_delete ON courts
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── Items ────────────────────────────────────────────────────
DROP POLICY IF EXISTS items_select ON items;
CREATE POLICY items_select ON items
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS items_insert ON items;
CREATE POLICY items_insert ON items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS items_update ON items;
CREATE POLICY items_update ON items
  FOR UPDATE USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS items_delete ON items;
CREATE POLICY items_delete ON items
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── Members ──────────────────────────────────────────────────
DROP POLICY IF EXISTS members_select ON members;
CREATE POLICY members_select ON members
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS members_insert ON members;
CREATE POLICY members_insert ON members
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS members_update ON members;
CREATE POLICY members_update ON members
  FOR UPDATE USING (tenant_id = current_tenant_id());

-- ── Bookings ─────────────────────────────────────────────────
DROP POLICY IF EXISTS bookings_select ON bookings;
CREATE POLICY bookings_select ON bookings
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS bookings_insert ON bookings;
CREATE POLICY bookings_insert ON bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS bookings_update ON bookings;
CREATE POLICY bookings_update ON bookings
  FOR UPDATE USING (tenant_id = current_tenant_id());

-- ── Booking Items ────────────────────────────────────────────
DROP POLICY IF EXISTS booking_items_select ON booking_items;
CREATE POLICY booking_items_select ON booking_items
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE tenant_id = current_tenant_id())
  );

DROP POLICY IF EXISTS booking_items_insert ON booking_items;
CREATE POLICY booking_items_insert ON booking_items
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- Helper functions: password hashing
-- ============================================================
CREATE OR REPLACE FUNCTION hash_password(plain TEXT) RETURNS TEXT AS $$
  SELECT crypt(plain, gen_salt('bf', 10));
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION verify_password(plain TEXT, hashed TEXT) RETURNS BOOLEAN AS $$
  SELECT hashed = crypt(plain, hashed);
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION hash_password(TEXT)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO anon, authenticated;

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
