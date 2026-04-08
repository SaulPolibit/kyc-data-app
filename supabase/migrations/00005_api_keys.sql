-- Migration: API Keys for External Integrations
-- This creates an API key system for external apps to create KYC/KYB links

-- ============================================================================
-- API Keys Table
-- ============================================================================

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(12) NOT NULL, -- First 8 chars for identification (e.g., "kycapp_a1b2")
    scopes TEXT[] DEFAULT ARRAY['links:create', 'links:read'],
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = true;

-- Update timestamp trigger
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- API Key Usage Log (for auditing)
-- ============================================================================

CREATE TABLE api_key_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    response_status INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_key_usage_api_key_id ON api_key_usage_log(api_key_id);
CREATE INDEX idx_api_key_usage_created_at ON api_key_usage_log(created_at);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can manage their own API keys
CREATE POLICY "Users can view own API keys"
    ON api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
    ON api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
    ON api_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
    ON api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- Users can view their API key usage
CREATE POLICY "Users can view own API key usage"
    ON api_key_usage_log FOR SELECT
    USING (
        api_key_id IN (
            SELECT id FROM api_keys WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- Functions for API Key Operations
-- ============================================================================

-- Function to validate an API key (used by external API)
-- Returns user_id if valid, NULL if invalid
CREATE OR REPLACE FUNCTION validate_api_key(p_key_hash VARCHAR)
RETURNS TABLE (
    user_id UUID,
    api_key_id UUID,
    scopes TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ak.user_id,
        ak.id as api_key_id,
        ak.scopes
    FROM api_keys ak
    WHERE ak.key_hash = p_key_hash
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log API key usage and update last_used_at
CREATE OR REPLACE FUNCTION log_api_key_usage(
    p_api_key_id UUID,
    p_endpoint VARCHAR,
    p_method VARCHAR,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_response_status INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Update last used timestamp
    UPDATE api_keys
    SET last_used_at = NOW()
    WHERE id = p_api_key_id;

    -- Log usage
    INSERT INTO api_key_usage_log (
        api_key_id, endpoint, method, ip_address, user_agent, response_status
    ) VALUES (
        p_api_key_id, p_endpoint, p_method, p_ip_address, p_user_agent, p_response_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION validate_api_key(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_api_key(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION log_api_key_usage(UUID, VARCHAR, VARCHAR, INET, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_api_key_usage(UUID, VARCHAR, VARCHAR, INET, TEXT, INTEGER) TO anon;
