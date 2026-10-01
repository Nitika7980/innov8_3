-- ====================================================================
-- LexShield AI — Supabase Database Migration & Schema Definition
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    organization TEXT DEFAULT '',
    role TEXT DEFAULT 'Freelancer',
    created_ip TEXT DEFAULT '',
    created_at DOUBLE PRECISION DEFAULT EXTRACT(EPOCH FROM NOW()),
    last_login DOUBLE PRECISION DEFAULT EXTRACT(EPOCH FROM NOW()),
    scans_count INT DEFAULT 0,
    preferences JSONB DEFAULT '{"default_currency": "$", "default_late_rate": 1.5, "auto_save_scans": true, "email_reminders": true}'::jsonb
);

-- Index for fast user lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. Create Contract Scans Table
CREATE TABLE IF NOT EXISTS public.contract_scans (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    doc_title TEXT NOT NULL,
    contract_text TEXT NOT NULL,
    safety_score INT NOT NULL,
    risk_grade TEXT NOT NULL,
    risks_count INT DEFAULT 0,
    analysis_data JSONB DEFAULT '{}'::jsonb,
    created_at DOUBLE PRECISION DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Index for retrieving user contract scan history
CREATE INDEX IF NOT EXISTS idx_contract_scans_user ON public.contract_scans(user_id);

-- 3. Create Telemetry & Audit Logs Table
CREATE TABLE IF NOT EXISTS public.telemetry_logs (
    id SERIAL PRIMARY KEY,
    client_ip TEXT,
    endpoint TEXT,
    method TEXT,
    status_code INT,
    response_time DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 4. GRANT TABLE & SCHEMA PERMISSIONS (Fixes PostgreSQL 42501 error)
-- ====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.contract_scans TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.telemetry_logs TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ====================================================================
-- 5. Row Level Security (RLS) & Public Policies for Anon Access
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon access to users" ON public.users;
CREATE POLICY "Allow anon access to users" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon access to contract_scans" ON public.contract_scans;
CREATE POLICY "Allow anon access to contract_scans" ON public.contract_scans FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon access to telemetry_logs" ON public.telemetry_logs;
CREATE POLICY "Allow anon access to telemetry_logs" ON public.telemetry_logs FOR ALL TO public USING (true) WITH CHECK (true);


-- ====================================================================
-- 5. Enable Supabase Realtime Publication for Live Data Sync
-- ====================================================================
-- Ensure full payloads (both old & new data) are broadcast on updates
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.contract_scans REPLICA IDENTITY FULL;
ALTER TABLE public.telemetry_logs REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contract_scans'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_scans;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'telemetry_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_logs;
    END IF;
END $$;

