-- Data Expiry Schema
-- Migration: 00008_data_expiry
-- Description: Add data_expires_at column to track when submitted form data should be deleted
-- This supports GDPR/compliance requirements for automatic data retention limits
--
-- DEPENDENCIES: Requires 00002_kyc_links.sql to be run first
-- - link_sessions table
-- - link_access_logs table
-- - customers table

-- ============================================================================
-- DEPENDENCY CHECK
-- ============================================================================

DO $$
BEGIN
    -- Check if link_sessions table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'link_sessions') THEN
        RAISE EXCEPTION 'Migration 00002_kyc_links.sql must be applied first. Missing: link_sessions table';
    END IF;

    -- Check if customers table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        RAISE EXCEPTION 'Migration 00001_initial_schema.sql must be applied first. Missing: customers table';
    END IF;
END $$;

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add data_expires_at column to link_sessions
-- This field is set when a form is completed, based on DATA_STORED_EXPIRY_DAYS env var
ALTER TABLE link_sessions
ADD COLUMN IF NOT EXISTS data_expires_at TIMESTAMPTZ;

-- Add index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_link_sessions_data_expires_at
ON link_sessions(data_expires_at)
WHERE data_expires_at IS NOT NULL AND is_completed = TRUE;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to set data expiration on session completion
-- Called from application layer with the expiry days from env var
CREATE OR REPLACE FUNCTION set_session_data_expiry(
    p_session_token TEXT,
    p_expiry_days INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
BEGIN
    SELECT * INTO session_record FROM link_sessions WHERE session_token = p_session_token;

    IF session_record IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Only set expiry if days > 0
    IF p_expiry_days > 0 THEN
        UPDATE link_sessions
        SET data_expires_at = NOW() + (p_expiry_days || ' days')::INTERVAL
        WHERE session_token = p_session_token;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired session data
-- This deletes form_data from sessions and associated customer records
-- Returns the number of sessions cleaned up
CREATE OR REPLACE FUNCTION cleanup_expired_session_data()
RETURNS TABLE (
    sessions_cleaned INTEGER,
    customers_deleted INTEGER
) AS $$
DECLARE
    v_sessions_cleaned INTEGER := 0;
    v_customers_deleted INTEGER := 0;
    session_record RECORD;
BEGIN
    -- Find all sessions with expired data
    FOR session_record IN
        SELECT id, customer_id, link_id
        FROM link_sessions
        WHERE data_expires_at IS NOT NULL
        AND data_expires_at < NOW()
        AND is_completed = TRUE
        AND (form_data IS NOT NULL OR customer_id IS NOT NULL)
    LOOP
        -- Delete associated customer record if exists
        IF session_record.customer_id IS NOT NULL THEN
            -- Delete related records first (addresses, identifications, associated_persons)
            DELETE FROM addresses WHERE customer_id = session_record.customer_id;
            DELETE FROM identifications WHERE customer_id = session_record.customer_id;
            DELETE FROM associated_persons WHERE customer_id = session_record.customer_id;
            DELETE FROM documents WHERE customer_id = session_record.customer_id;

            -- Delete the customer record
            DELETE FROM customers WHERE id = session_record.customer_id;
            v_customers_deleted := v_customers_deleted + 1;
        END IF;

        -- Clear form_data and customer_id from session (keep session record for audit)
        UPDATE link_sessions
        SET
            form_data = NULL,
            customer_id = NULL
        WHERE id = session_record.id;

        v_sessions_cleaned := v_sessions_cleaned + 1;

        -- Log the cleanup action
        INSERT INTO link_access_logs (link_id, session_id, action, metadata)
        VALUES (
            session_record.link_id,
            session_record.id,
            'data_expired',
            jsonb_build_object(
                'reason', 'automatic_data_retention_cleanup',
                'expired_at', NOW()
            )
        );
    END LOOP;

    RETURN QUERY SELECT v_sessions_cleaned, v_customers_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Allow anon to call set_session_data_expiry (called during form completion)
GRANT EXECUTE ON FUNCTION set_session_data_expiry(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION set_session_data_expiry(TEXT, INTEGER) TO authenticated;

-- Only authenticated/service role should run cleanup
GRANT EXECUTE ON FUNCTION cleanup_expired_session_data() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN link_sessions.data_expires_at IS 'When the form data should be automatically deleted (set on completion based on DATA_STORED_EXPIRY_DAYS)';
COMMENT ON FUNCTION set_session_data_expiry(TEXT, INTEGER) IS 'Sets the data expiration date for a completed session';
COMMENT ON FUNCTION cleanup_expired_session_data() IS 'Deletes form_data and customer records for sessions past their data retention period';
