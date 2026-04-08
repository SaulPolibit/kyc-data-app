-- KYC Links Schema
-- Migration: 00002_kyc_links
-- Description: Embeddable KYC link system for third-party integration
-- Allows generating shareable links that can be embedded in external applications
--
-- DEPENDENCIES: Requires 00001_initial_schema.sql to be run first
-- - customer_type enum
-- - customers table

-- ============================================================================
-- DEPENDENCY CHECK
-- ============================================================================

-- Verify that the first migration was applied
DO $$
BEGIN
    -- Check if customer_type enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
        RAISE EXCEPTION 'Migration 00001_initial_schema.sql must be applied first. Missing: customer_type enum';
    END IF;

    -- Check if customers table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        RAISE EXCEPTION 'Migration 00001_initial_schema.sql must be applied first. Missing: customers table';
    END IF;
END $$;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Link status
CREATE TYPE link_status AS ENUM (
    'active',
    'completed',
    'expired',
    'revoked'
);

-- Link access type
CREATE TYPE link_access_type AS ENUM (
    'single_use',      -- Can only be completed once
    'multi_use',       -- Can be used multiple times (for testing/demo)
    'time_limited'     -- Valid until expiration
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- KYC Links - Shareable/embeddable links for KYC collection
CREATE TABLE kyc_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner (the authenticated user who created the link)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Link token (public identifier, used in URL)
    token TEXT NOT NULL UNIQUE,

    -- Link configuration
    link_type customer_type NOT NULL, -- 'individual' or 'business'
    access_type link_access_type NOT NULL DEFAULT 'single_use',
    status link_status NOT NULL DEFAULT 'active',

    -- Customization
    title TEXT, -- Custom title shown on the form
    description TEXT, -- Custom description/instructions
    redirect_url TEXT, -- URL to redirect after completion
    webhook_url TEXT, -- URL to POST completion notification

    -- Branding (optional)
    logo_url TEXT,
    primary_color TEXT, -- Hex color for branding

    -- Allowed embedding domains (comma-separated, empty = allow all)
    allowed_domains TEXT,

    -- Expiration
    expires_at TIMESTAMPTZ,

    -- Usage tracking
    max_submissions INTEGER, -- NULL = unlimited
    submission_count INTEGER NOT NULL DEFAULT 0,

    -- Metadata for external reference
    external_id TEXT, -- ID from the integrating system
    metadata JSONB, -- Additional custom data

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Link Sessions - Track each form session started via a link
CREATE TABLE link_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    link_id UUID NOT NULL REFERENCES kyc_links(id) ON DELETE CASCADE,

    -- Session token (for resuming partially filled forms)
    session_token TEXT NOT NULL UNIQUE,

    -- Progress tracking
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL DEFAULT 1,
    form_data JSONB, -- Partial form data (encrypted sensitive fields)

    -- Status
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,

    -- Customer created from this session (after completion)
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Client info
    ip_address INET,
    user_agent TEXT,

    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Link Access Logs - Track all accesses to links
CREATE TABLE link_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    link_id UUID NOT NULL REFERENCES kyc_links(id) ON DELETE CASCADE,
    session_id UUID REFERENCES link_sessions(id) ON DELETE SET NULL,

    -- Access info
    action TEXT NOT NULL, -- 'view', 'start', 'save_progress', 'submit', 'complete'

    -- Client info
    ip_address INET,
    user_agent TEXT,
    referer TEXT,

    -- Metadata
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- KYC Links indexes
CREATE INDEX idx_kyc_links_user_id ON kyc_links(user_id);
CREATE INDEX idx_kyc_links_token ON kyc_links(token);
CREATE INDEX idx_kyc_links_status ON kyc_links(status);
CREATE INDEX idx_kyc_links_external_id ON kyc_links(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_kyc_links_expires_at ON kyc_links(expires_at) WHERE expires_at IS NOT NULL;

-- Link Sessions indexes
CREATE INDEX idx_link_sessions_link_id ON link_sessions(link_id);
CREATE INDEX idx_link_sessions_session_token ON link_sessions(session_token);
CREATE INDEX idx_link_sessions_customer_id ON link_sessions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_link_sessions_expires_at ON link_sessions(expires_at);

-- Link Access Logs indexes
CREATE INDEX idx_link_access_logs_link_id ON link_access_logs(link_id);
CREATE INDEX idx_link_access_logs_session_id ON link_access_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_link_access_logs_created_at ON link_access_logs(created_at);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate secure random token
CREATE OR REPLACE FUNCTION generate_link_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Check if link is valid (not expired, not revoked, within limits)
CREATE OR REPLACE FUNCTION is_link_valid(p_link_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    link_record RECORD;
BEGIN
    SELECT * INTO link_record FROM kyc_links WHERE id = p_link_id;

    IF link_record IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check status
    IF link_record.status != 'active' THEN
        RETURN FALSE;
    END IF;

    -- Check expiration
    IF link_record.expires_at IS NOT NULL AND link_record.expires_at < NOW() THEN
        -- Update status to expired
        UPDATE kyc_links SET status = 'expired' WHERE id = p_link_id;
        RETURN FALSE;
    END IF;

    -- Check submission limit
    IF link_record.max_submissions IS NOT NULL
       AND link_record.submission_count >= link_record.max_submissions THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get link by token (public function for anonymous access)
CREATE OR REPLACE FUNCTION get_link_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    link_type customer_type,
    title TEXT,
    description TEXT,
    logo_url TEXT,
    primary_color TEXT,
    is_valid BOOLEAN
) AS $$
DECLARE
    link_record RECORD;
BEGIN
    SELECT kl.* INTO link_record FROM kyc_links kl WHERE kl.token = p_token;

    IF link_record IS NULL THEN
        RETURN;
    END IF;

    -- Update last accessed
    UPDATE kyc_links SET last_accessed_at = NOW() WHERE kyc_links.id = link_record.id;

    RETURN QUERY SELECT
        link_record.id,
        link_record.link_type,
        link_record.title,
        link_record.description,
        link_record.logo_url,
        link_record.primary_color,
        is_link_valid(link_record.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new link session
CREATE OR REPLACE FUNCTION create_link_session(
    p_link_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_session_id UUID;
    session_token TEXT;
    link_record RECORD;
BEGIN
    -- Verify link is valid
    IF NOT is_link_valid(p_link_id) THEN
        RAISE EXCEPTION 'Link is not valid or has expired';
    END IF;

    -- Get link info for step count
    SELECT * INTO link_record FROM kyc_links WHERE id = p_link_id;

    -- Generate session token
    session_token := generate_link_token(48);

    -- Create session
    INSERT INTO link_sessions (
        link_id,
        session_token,
        total_steps,
        ip_address,
        user_agent
    ) VALUES (
        p_link_id,
        session_token,
        CASE WHEN link_record.link_type = 'business' THEN 4 ELSE 3 END,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO new_session_id;

    -- Log access
    INSERT INTO link_access_logs (link_id, session_id, action, ip_address, user_agent)
    VALUES (p_link_id, new_session_id, 'start', p_ip_address, p_user_agent);

    RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update link session progress
CREATE OR REPLACE FUNCTION update_link_session(
    p_session_token TEXT,
    p_current_step INTEGER,
    p_form_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
BEGIN
    SELECT * INTO session_record FROM link_sessions WHERE session_token = p_session_token;

    IF session_record IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if session expired
    IF session_record.expires_at < NOW() THEN
        RETURN FALSE;
    END IF;

    -- Check if already completed
    IF session_record.is_completed THEN
        RETURN FALSE;
    END IF;

    -- Update session
    UPDATE link_sessions SET
        current_step = p_current_step,
        form_data = p_form_data,
        updated_at = NOW()
    WHERE session_token = p_session_token;

    -- Log progress save
    INSERT INTO link_access_logs (link_id, session_id, action, metadata)
    VALUES (session_record.link_id, session_record.id, 'save_progress',
            jsonb_build_object('step', p_current_step));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete link session and create customer
CREATE OR REPLACE FUNCTION complete_link_session(
    p_session_token TEXT,
    p_customer_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
    link_record RECORD;
BEGIN
    SELECT * INTO session_record FROM link_sessions WHERE session_token = p_session_token;

    IF session_record IS NULL OR session_record.is_completed THEN
        RETURN FALSE;
    END IF;

    -- Get link
    SELECT * INTO link_record FROM kyc_links WHERE id = session_record.link_id;

    -- Update session
    UPDATE link_sessions SET
        is_completed = TRUE,
        customer_id = p_customer_id,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE session_token = p_session_token;

    -- Update link submission count
    UPDATE kyc_links SET
        submission_count = submission_count + 1,
        completed_at = NOW(),
        updated_at = NOW(),
        status = CASE
            WHEN access_type = 'single_use' THEN 'completed'::link_status
            WHEN max_submissions IS NOT NULL AND submission_count + 1 >= max_submissions THEN 'completed'::link_status
            ELSE status
        END
    WHERE id = session_record.link_id;

    -- Log completion
    INSERT INTO link_access_logs (link_id, session_id, action, metadata)
    VALUES (session_record.link_id, session_record.id, 'complete',
            jsonb_build_object('customer_id', p_customer_id));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_link_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM link_sessions
    WHERE expires_at < NOW() - INTERVAL '7 days'
    AND is_completed = FALSE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-generate token on insert if not provided
CREATE OR REPLACE FUNCTION auto_generate_link_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token IS NULL OR NEW.token = '' THEN
        NEW.token := generate_link_token(32);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_kyc_link_token
    BEFORE INSERT ON kyc_links
    FOR EACH ROW EXECUTE FUNCTION auto_generate_link_token();

-- Function to update updated_at timestamp (CREATE OR REPLACE for idempotency)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update updated_at triggers
CREATE TRIGGER update_kyc_links_updated_at
    BEFORE UPDATE ON kyc_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_link_sessions_updated_at
    BEFORE UPDATE ON link_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE kyc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_access_logs ENABLE ROW LEVEL SECURITY;

-- KYC Links policies (authenticated users manage their own links)
-- Note: Link management uses basic auth check. Sensitive data collection
-- still goes through the main tables which have stricter policies.

CREATE POLICY "kyc_links_select_own" ON kyc_links
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "kyc_links_insert_own" ON kyc_links
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "kyc_links_update_own" ON kyc_links
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "kyc_links_delete_own" ON kyc_links
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Link Sessions policies (users can view sessions for their links)
CREATE POLICY "link_sessions_select_own" ON link_sessions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM kyc_links
            WHERE kyc_links.id = link_sessions.link_id
            AND kyc_links.user_id = auth.uid()
        )
    );

-- Anonymous access for public link functions is handled by SECURITY DEFINER functions

-- Link Access Logs policies (users can view logs for their links)
CREATE POLICY "link_access_logs_select_own" ON link_access_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM kyc_links
            WHERE kyc_links.id = link_access_logs.link_id
            AND kyc_links.user_id = auth.uid()
        )
    );

-- ============================================================================
-- ANONYMOUS ACCESS POLICIES
-- These allow the public functions to work for unauthenticated users
-- ============================================================================

-- Allow anonymous to call specific functions via anon role
GRANT EXECUTE ON FUNCTION get_link_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_link_session(UUID, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_link_session(TEXT, INTEGER, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION complete_link_session(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_link_valid(UUID) TO anon;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON kyc_links TO authenticated;
GRANT SELECT ON link_sessions TO authenticated;
GRANT SELECT ON link_access_logs TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE kyc_links IS 'Shareable/embeddable KYC collection links';
COMMENT ON TABLE link_sessions IS 'Active form sessions started via links';
COMMENT ON TABLE link_access_logs IS 'Access and activity logs for links';
COMMENT ON FUNCTION get_link_by_token(TEXT) IS 'Public function to retrieve link info by token';
COMMENT ON FUNCTION create_link_session(UUID, INET, TEXT) IS 'Creates a new form session for a link';
COMMENT ON FUNCTION complete_link_session(TEXT, UUID) IS 'Marks a session as complete and links to customer';
