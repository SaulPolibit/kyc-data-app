-- Session Status Schema
-- Migration: 00004_session_status
-- Description: Add detailed session status workflow with webhook triggers
--
-- DEPENDENCIES: Requires 00002_kyc_links.sql and 00003_webhooks.sql

-- ============================================================================
-- DEPENDENCY CHECK
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'link_sessions') THEN
        RAISE EXCEPTION 'Migration 00002_kyc_links.sql must be applied first. Missing: link_sessions table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
        RAISE EXCEPTION 'Migration 00003_webhooks.sql must be applied first. Missing: webhooks table';
    END IF;
END $$;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Session workflow status
CREATE TYPE session_status AS ENUM (
    'draft',              -- Session created but not started
    'personal_info',      -- KYC Step 1: Personal information
    'business_info',      -- KYB Step 1: Business information
    'identification',     -- KYC Step 2: ID upload
    'address',            -- KYC Step 3 / KYB Step 2: Address information
    'beneficial_owners',  -- KYB Step 3: Beneficial owners & signers
    'documents',          -- KYB Step 4: Document uploads
    'review',             -- Final review before submission
    'submitted',          -- Awaiting admin review
    'approved',           -- Verification approved
    'rejected'            -- Verification rejected
);

-- ============================================================================
-- MODIFY LINK_SESSIONS TABLE
-- ============================================================================

-- Add status column with default 'draft'
ALTER TABLE link_sessions
ADD COLUMN IF NOT EXISTS status session_status NOT NULL DEFAULT 'draft';

-- Add status change timestamp
ALTER TABLE link_sessions
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add status history (array of transitions)
ALTER TABLE link_sessions
ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Add indexes for status queries
CREATE INDEX IF NOT EXISTS idx_link_sessions_status ON link_sessions(status);
CREATE INDEX IF NOT EXISTS idx_link_sessions_status_changed_at ON link_sessions(status_changed_at);

-- ============================================================================
-- SESSION STATUS LOG TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES link_sessions(id) ON DELETE CASCADE,

    -- Status change
    previous_status session_status,
    new_status session_status NOT NULL,

    -- Context
    changed_by TEXT NOT NULL DEFAULT 'system', -- 'system', 'user', 'admin', or user_id
    reason TEXT,
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_status_log_session_id ON session_status_log(session_id);
CREATE INDEX IF NOT EXISTS idx_session_status_log_created_at ON session_status_log(created_at);

-- ============================================================================
-- STATUS TRANSITION VALIDATION FUNCTION
-- ============================================================================

-- Check if a status transition is valid based on link type
CREATE OR REPLACE FUNCTION is_valid_status_transition(
    p_current_status session_status,
    p_new_status session_status,
    p_link_type customer_type
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Same status is always valid (no-op)
    IF p_current_status = p_new_status THEN
        RETURN TRUE;
    END IF;

    -- Define valid transitions
    RETURN CASE
        -- From draft: can start with personal_info (KYC) or business_info (KYB)
        WHEN p_current_status = 'draft' AND p_new_status = 'personal_info' AND p_link_type = 'individual' THEN TRUE
        WHEN p_current_status = 'draft' AND p_new_status = 'business_info' AND p_link_type = 'business' THEN TRUE

        -- KYC flow: personal_info -> identification -> address -> review
        WHEN p_current_status = 'personal_info' AND p_new_status IN ('identification', 'draft') THEN TRUE
        WHEN p_current_status = 'identification' AND p_new_status IN ('address', 'personal_info') THEN TRUE
        WHEN p_current_status = 'address' AND p_new_status IN ('review', 'identification') AND p_link_type = 'individual' THEN TRUE

        -- KYB flow: business_info -> address -> beneficial_owners -> documents -> review
        WHEN p_current_status = 'business_info' AND p_new_status IN ('address', 'draft') THEN TRUE
        WHEN p_current_status = 'address' AND p_new_status IN ('beneficial_owners', 'business_info') AND p_link_type = 'business' THEN TRUE
        WHEN p_current_status = 'beneficial_owners' AND p_new_status IN ('documents', 'address') THEN TRUE
        WHEN p_current_status = 'documents' AND p_new_status IN ('review', 'beneficial_owners') THEN TRUE

        -- Review stage
        WHEN p_current_status = 'review' AND p_new_status = 'submitted' THEN TRUE
        -- Allow going back from review
        WHEN p_current_status = 'review' AND p_new_status = 'address' AND p_link_type = 'individual' THEN TRUE
        WHEN p_current_status = 'review' AND p_new_status = 'identification' AND p_link_type = 'individual' THEN TRUE
        WHEN p_current_status = 'review' AND p_new_status = 'documents' AND p_link_type = 'business' THEN TRUE
        WHEN p_current_status = 'review' AND p_new_status = 'beneficial_owners' AND p_link_type = 'business' THEN TRUE

        -- Admin decisions from submitted
        WHEN p_current_status = 'submitted' AND p_new_status IN ('approved', 'rejected') THEN TRUE

        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STATUS TRANSITION FUNCTION
-- ============================================================================

-- Transition a session to a new status with validation and logging
CREATE OR REPLACE FUNCTION transition_session_status(
    p_session_id UUID,
    p_new_status session_status,
    p_changed_by TEXT DEFAULT 'system',
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
    link_record RECORD;
    old_status session_status;
BEGIN
    -- Get current session with link info
    SELECT ls.*, kl.link_type, kl.user_id as link_user_id
    INTO session_record
    FROM link_sessions ls
    JOIN kyc_links kl ON kl.id = ls.link_id
    WHERE ls.id = p_session_id;

    IF session_record IS NULL THEN
        RAISE WARNING 'Session not found: %', p_session_id;
        RETURN FALSE;
    END IF;

    old_status := session_record.status;

    -- Skip if same status
    IF old_status = p_new_status THEN
        RETURN TRUE;
    END IF;

    -- Validate transition
    IF NOT is_valid_status_transition(old_status, p_new_status, session_record.link_type) THEN
        RAISE WARNING 'Invalid status transition from % to % for link type %',
            old_status, p_new_status, session_record.link_type;
        RETURN FALSE;
    END IF;

    -- Update session status
    UPDATE link_sessions SET
        status = p_new_status,
        status_changed_at = NOW(),
        status_history = status_history || jsonb_build_object(
            'from', old_status::TEXT,
            'to', p_new_status::TEXT,
            'at', NOW(),
            'by', p_changed_by
        ),
        updated_at = NOW()
    WHERE id = p_session_id;

    -- Log the change
    INSERT INTO session_status_log (
        session_id,
        previous_status,
        new_status,
        changed_by,
        reason,
        metadata
    ) VALUES (
        p_session_id,
        old_status,
        p_new_status,
        p_changed_by,
        p_reason,
        COALESCE(p_metadata, '{}'::JSONB) || jsonb_build_object(
            'link_id', session_record.link_id,
            'link_type', session_record.link_type
        )
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE EXISTING FUNCTIONS
-- ============================================================================

-- Update create_link_session to set correct total_steps and initial status
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
    initial_status session_status;
    v_total_steps INTEGER;
BEGIN
    -- Verify link is valid
    IF NOT is_link_valid(p_link_id) THEN
        RAISE EXCEPTION 'Link is not valid or has expired';
    END IF;

    -- Get link info for step count and type
    SELECT * INTO link_record FROM kyc_links WHERE id = p_link_id;

    -- Set total steps based on link type
    -- Individual (KYC): 4 steps (personal_info, identification, address, review)
    -- Business (KYB): 5 steps (business_info, address, beneficial_owners, documents, review)
    IF link_record.link_type = 'business' THEN
        v_total_steps := 5;
    ELSE
        v_total_steps := 4;
    END IF;

    -- Generate session token
    session_token := generate_link_token(48);

    -- Create session with draft status
    INSERT INTO link_sessions (
        link_id,
        session_token,
        total_steps,
        status,
        status_changed_at,
        status_history,
        ip_address,
        user_agent
    ) VALUES (
        p_link_id,
        session_token,
        v_total_steps,
        'draft',
        NOW(),
        '[]'::JSONB,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO new_session_id;

    -- Log access
    INSERT INTO link_access_logs (link_id, session_id, action, ip_address, user_agent)
    VALUES (p_link_id, new_session_id, 'start', p_ip_address, p_user_agent);

    RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update update_link_session to transition status based on step
CREATE OR REPLACE FUNCTION update_link_session(
    p_session_token TEXT,
    p_current_step INTEGER,
    p_form_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
    link_record RECORD;
    new_status session_status;
BEGIN
    -- Get session with link info
    SELECT ls.*, kl.link_type
    INTO session_record
    FROM link_sessions ls
    JOIN kyc_links kl ON kl.id = ls.link_id
    WHERE ls.session_token = p_session_token;

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

    -- Determine new status based on step and link type
    IF session_record.link_type = 'individual' THEN
        -- KYC: step 1=personal_info, 2=identification, 3=address, 4=review
        new_status := CASE p_current_step
            WHEN 1 THEN 'personal_info'
            WHEN 2 THEN 'identification'
            WHEN 3 THEN 'address'
            WHEN 4 THEN 'review'
            ELSE session_record.status
        END;
    ELSE
        -- KYB: step 1=business_info, 2=address, 3=beneficial_owners, 4=documents, 5=review
        new_status := CASE p_current_step
            WHEN 1 THEN 'business_info'
            WHEN 2 THEN 'address'
            WHEN 3 THEN 'beneficial_owners'
            WHEN 4 THEN 'documents'
            WHEN 5 THEN 'review'
            ELSE session_record.status
        END;
    END IF;

    -- Update session
    UPDATE link_sessions SET
        current_step = p_current_step,
        form_data = p_form_data,
        updated_at = NOW()
    WHERE session_token = p_session_token;

    -- Transition status if changed
    IF session_record.status != new_status THEN
        PERFORM transition_session_status(
            session_record.id,
            new_status,
            'user',
            'Step ' || p_current_step || ' reached'
        );
    END IF;

    -- Log progress save
    INSERT INTO link_access_logs (link_id, session_id, action, metadata)
    VALUES (session_record.link_id, session_record.id, 'save_progress',
            jsonb_build_object('step', p_current_step, 'status', new_status::TEXT));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update complete_link_session to transition to submitted
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

    -- First transition to review if not already there
    IF session_record.status NOT IN ('review', 'submitted') THEN
        PERFORM transition_session_status(session_record.id, 'review', 'user', 'Ready for submission');
    END IF;

    -- Update session
    UPDATE link_sessions SET
        is_completed = TRUE,
        customer_id = p_customer_id,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE session_token = p_session_token;

    -- Transition to submitted
    PERFORM transition_session_status(session_record.id, 'submitted', 'user', 'Form submitted');

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
            jsonb_build_object('customer_id', p_customer_id, 'status', 'submitted'));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get session with status info by token
CREATE OR REPLACE FUNCTION get_session_by_token(p_session_token TEXT)
RETURNS TABLE (
    id UUID,
    link_id UUID,
    session_token TEXT,
    current_step INTEGER,
    total_steps INTEGER,
    form_data JSONB,
    is_completed BOOLEAN,
    customer_id UUID,
    status session_status,
    status_changed_at TIMESTAMPTZ,
    status_history JSONB,
    started_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    link_type customer_type
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ls.id,
        ls.link_id,
        ls.session_token,
        ls.current_step,
        ls.total_steps,
        ls.form_data,
        ls.is_completed,
        ls.customer_id,
        ls.status,
        ls.status_changed_at,
        ls.status_history,
        ls.started_at,
        ls.updated_at,
        ls.completed_at,
        ls.expires_at,
        kl.link_type
    FROM link_sessions ls
    JOIN kyc_links kl ON kl.id = ls.link_id
    WHERE ls.session_token = p_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE session_status_log ENABLE ROW LEVEL SECURITY;

-- Users can view status logs for sessions of their links
CREATE POLICY "session_status_log_select_own" ON session_status_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM link_sessions ls
            JOIN kyc_links kl ON kl.id = ls.link_id
            WHERE ls.id = session_status_log.session_id
            AND kl.user_id = auth.uid()
        )
    );

-- Service role can insert (used by SECURITY DEFINER functions)
CREATE POLICY "session_status_log_insert_service" ON session_status_log
    FOR INSERT TO service_role
    WITH CHECK (TRUE);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON session_status_log TO authenticated;
GRANT EXECUTE ON FUNCTION transition_session_status(UUID, session_status, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION get_session_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION is_valid_status_transition(session_status, session_status, customer_type) TO anon;

-- ============================================================================
-- DATA MIGRATION - Update existing sessions
-- ============================================================================

-- Migrate existing sessions to appropriate status based on current state
DO $$
DECLARE
    rec RECORD;
    new_status session_status;
BEGIN
    FOR rec IN
        SELECT ls.*, kl.link_type
        FROM link_sessions ls
        JOIN kyc_links kl ON kl.id = ls.link_id
        WHERE ls.status = 'draft' -- Only migrate sessions with default draft status
    LOOP
        -- Determine status based on completion and step
        IF rec.is_completed THEN
            new_status := 'submitted';
        ELSIF rec.link_type = 'individual' THEN
            new_status := CASE rec.current_step
                WHEN 1 THEN 'personal_info'
                WHEN 2 THEN 'identification'
                WHEN 3 THEN 'address'
                WHEN 4 THEN 'review'
                ELSE 'draft'
            END;
        ELSE
            new_status := CASE rec.current_step
                WHEN 1 THEN 'business_info'
                WHEN 2 THEN 'address'
                WHEN 3 THEN 'beneficial_owners'
                WHEN 4 THEN 'documents'
                WHEN 5 THEN 'review'
                ELSE 'draft'
            END;
        END IF;

        -- Update if status should change
        IF new_status != 'draft' THEN
            UPDATE link_sessions SET
                status = new_status,
                status_changed_at = COALESCE(completed_at, updated_at),
                status_history = jsonb_build_array(
                    jsonb_build_object(
                        'from', 'draft',
                        'to', new_status::TEXT,
                        'at', COALESCE(completed_at, updated_at),
                        'by', 'migration'
                    )
                )
            WHERE id = rec.id;
        END IF;
    END LOOP;
END $$;

-- Also update total_steps for existing sessions based on link type
UPDATE link_sessions ls
SET total_steps = CASE
    WHEN kl.link_type = 'business' THEN 5
    ELSE 4
END
FROM kyc_links kl
WHERE kl.id = ls.link_id
AND ls.total_steps NOT IN (4, 5);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TYPE session_status IS 'Workflow status for KYC/KYB sessions';
COMMENT ON TABLE session_status_log IS 'Audit trail of all session status changes';
COMMENT ON FUNCTION transition_session_status(UUID, session_status, TEXT, TEXT, JSONB) IS 'Transition a session to a new status with validation and logging';
COMMENT ON FUNCTION is_valid_status_transition(session_status, session_status, customer_type) IS 'Check if a status transition is valid for the given link type';
COMMENT ON FUNCTION get_session_by_token(TEXT) IS 'Get session with status info and link type by token';
