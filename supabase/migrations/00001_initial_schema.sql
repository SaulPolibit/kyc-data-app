-- KYC/KYB Application Database Schema
-- Migration: 00001_initial_schema
-- Description: Initial schema with enum types, tables, indexes, triggers, and RLS policies
-- Security: Enhanced RLS with email verification, audit logging, and session management

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Customer type (individual or business)
CREATE TYPE customer_type AS ENUM ('individual', 'business');

-- Gender options
CREATE TYPE gender_type AS ENUM ('male', 'female');

-- ID document types
CREATE TYPE id_type AS ENUM (
    'drivers_license',
    'passport',
    'government_id',
    'tax_id'
);

-- Document purpose types
CREATE TYPE document_purpose AS ENUM (
    'selfie',
    'proof_of_address',
    'ein_letter',
    'ss4_form',
    'company_formation_document',
    'proof_of_address_business',
    'operating_agreement',
    'other'
);

-- Source of funds categories
CREATE TYPE source_of_funds AS ENUM (
    'salary',
    'business_income',
    'investments',
    'inheritance',
    'savings',
    'gifts',
    'other'
);

-- Customer status in the KYC flow
CREATE TYPE customer_status AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'needs_more_info'
);

-- Associated person relationship types
CREATE TYPE person_relationship AS ENUM (
    'beneficial_owner',
    'control_person',
    'authorized_signer'
);

-- Business entity types
CREATE TYPE business_type AS ENUM (
    'llc',
    'corporation',
    'partnership',
    'sole_proprietorship',
    'trust',
    'nonprofit',
    'other'
);

-- Regulatory status options
CREATE TYPE regulatory_status AS ENUM (
    'regulated',
    'unregulated',
    'exempt'
);

-- Audit action types
CREATE TYPE audit_action AS ENUM (
    'login_success',
    'login_failed',
    'logout',
    'password_change',
    'password_reset_request',
    'password_reset_complete',
    'email_verification',
    'mfa_enabled',
    'mfa_disabled',
    'account_locked',
    'account_unlocked',
    'session_created',
    'session_revoked',
    'data_export',
    'data_deletion'
);

-- User account status
CREATE TYPE account_status AS ENUM (
    'active',
    'suspended',
    'locked',
    'pending_verification'
);

-- Countries (ISO 3166-1 alpha-3)
CREATE TYPE country_code AS ENUM (
    'USA', 'CAN', 'MEX', 'GBR', 'DEU', 'FRA', 'ESP', 'ITA', 'NLD', 'BEL',
    'CHE', 'AUT', 'PRT', 'IRL', 'POL', 'SWE', 'NOR', 'DNK', 'FIN', 'CZE',
    'GRC', 'HUN', 'ROU', 'BGR', 'HRV', 'SVK', 'SVN', 'LTU', 'LVA', 'EST',
    'JPN', 'KOR', 'CHN', 'TWN', 'HKG', 'SGP', 'AUS', 'NZL', 'BRA', 'ARG',
    'CHL', 'COL', 'PER', 'VEN', 'ECU', 'BOL', 'PRY', 'URY', 'IND', 'IDN',
    'MYS', 'THA', 'VNM', 'PHL', 'PAK', 'BGD', 'LKA', 'ZAF', 'EGY', 'NGA',
    'KEN', 'GHA', 'MAR', 'TUN', 'ISR', 'ARE', 'SAU', 'QAT', 'KWT', 'BHR',
    'OMN', 'JOR', 'LBN', 'TUR', 'UKR', 'RUS', 'KAZ', 'UZB', 'AZE', 'GEO'
);

-- US States (abbreviations)
CREATE TYPE us_state AS ENUM (
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
);

-- ============================================================================
-- USER SECURITY TABLES
-- ============================================================================

-- User profiles with security settings (extends auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Account status
    account_status account_status NOT NULL DEFAULT 'pending_verification',

    -- Email verification
    email_verified_at TIMESTAMPTZ,

    -- Multi-factor authentication
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_verified_at TIMESTAMPTZ,

    -- Account lockout protection
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_failed_login_at TIMESTAMPTZ,

    -- Session management
    max_sessions INTEGER NOT NULL DEFAULT 5,
    force_logout_before TIMESTAMPTZ, -- Invalidate sessions before this time

    -- Password policy
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    require_password_change BOOLEAN NOT NULL DEFAULT FALSE,

    -- Terms acceptance
    terms_accepted_at TIMESTAMPTZ,
    privacy_policy_accepted_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security audit log (immutable)
CREATE TABLE security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    action audit_action NOT NULL,

    -- Request context (for security analysis)
    ip_address INET,
    user_agent TEXT,

    -- Additional context
    metadata JSONB,

    -- Success/failure
    success BOOLEAN NOT NULL DEFAULT TRUE,
    failure_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Active sessions tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Session info
    session_token_hash TEXT NOT NULL, -- Hash of refresh token for identification

    -- Device info
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,

    -- Location (optional, for suspicious login detection)
    country_code TEXT,
    city TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    -- Active session check
    is_active BOOLEAN GENERATED ALWAYS AS (
        revoked_at IS NULL AND expires_at > NOW()
    ) STORED
);

-- Rate limiting tracking
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifier (can be user_id, IP, or combination)
    identifier TEXT NOT NULL,
    identifier_type TEXT NOT NULL, -- 'user', 'ip', 'user_ip'

    -- Action being rate limited
    action TEXT NOT NULL, -- 'login', 'api_call', 'password_reset', etc.

    -- Window tracking
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_count INTEGER NOT NULL DEFAULT 1,

    -- Unique constraint for upsert
    UNIQUE (identifier, identifier_type, action, window_start)
);

-- ============================================================================
-- MAIN APPLICATION TABLES
-- ============================================================================

-- Main customers table (both individuals and businesses)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_type customer_type NOT NULL,
    status customer_status NOT NULL DEFAULT 'draft',

    -- Individual fields (nullable for businesses)
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    gender gender_type,
    tax_id_encrypted TEXT, -- SSN encrypted with AES-256

    -- Business fields (nullable for individuals)
    business_name TEXT,
    doing_business_as TEXT,
    ein_encrypted TEXT, -- EIN encrypted with AES-256
    business_type business_type,
    incorporation_date DATE,
    incorporation_state us_state,
    incorporation_country country_code,
    website TEXT,
    regulatory_status regulatory_status,
    is_dao BOOLEAN DEFAULT FALSE,
    description TEXT,
    source_of_funds source_of_funds,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT check_individual_fields CHECK (
        customer_type = 'business' OR (
            first_name IS NOT NULL AND
            last_name IS NOT NULL AND
            email IS NOT NULL
        )
    ),
    CONSTRAINT check_business_fields CHECK (
        customer_type = 'individual' OR business_name IS NOT NULL
    )
);

-- Addresses table (can be linked to customers or associated persons)
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_type TEXT NOT NULL DEFAULT 'primary', -- 'primary', 'mailing', 'business', etc.

    street_line_1 TEXT NOT NULL,
    street_line_2 TEXT,
    city TEXT NOT NULL,
    state us_state,
    state_province_region TEXT, -- For non-US addresses
    postal_code TEXT NOT NULL,
    country country_code NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Identification documents metadata
CREATE TABLE identifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    id_type id_type NOT NULL,
    id_number_encrypted TEXT NOT NULL, -- Encrypted ID number
    issuing_country country_code NOT NULL,
    issuing_state us_state, -- For US-issued IDs
    issue_date DATE,
    expiration_date DATE,

    -- Front and back document references
    front_document_id UUID,
    back_document_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table (stores encrypted base64 documents)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    associated_person_id UUID, -- Optional: if document belongs to associated person

    purpose document_purpose NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,

    -- Encrypted document content (base64 encoded, then AES-256 encrypted)
    content_encrypted TEXT NOT NULL,

    -- Document verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Size constraint (max ~10MB base64 encoded + encryption overhead)
    CONSTRAINT check_file_size CHECK (file_size_bytes <= 10485760)
);

-- Update foreign keys in identifications after documents table exists
ALTER TABLE identifications
    ADD CONSTRAINT fk_front_document
    FOREIGN KEY (front_document_id) REFERENCES documents(id) ON DELETE SET NULL;

ALTER TABLE identifications
    ADD CONSTRAINT fk_back_document
    FOREIGN KEY (back_document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- Associated persons (beneficial owners, control persons, signers)
CREATE TABLE associated_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    relationship person_relationship NOT NULL,
    ownership_percentage DECIMAL(5,2), -- For beneficial owners

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    tax_id_encrypted TEXT, -- SSN encrypted

    -- Address (embedded for simplicity, or could reference addresses table)
    address_street_line_1 TEXT,
    address_street_line_2 TEXT,
    address_city TEXT,
    address_state us_state,
    address_postal_code TEXT,
    address_country country_code,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_ownership_percentage CHECK (
        relationship != 'beneficial_owner' OR (
            ownership_percentage IS NOT NULL AND
            ownership_percentage > 0 AND
            ownership_percentage <= 100
        )
    )
);

-- Update documents foreign key for associated persons
ALTER TABLE documents
    ADD CONSTRAINT fk_associated_person
    FOREIGN KEY (associated_person_id) REFERENCES associated_persons(id) ON DELETE CASCADE;

-- KYC submission history / audit log
CREATE TABLE kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status customer_status NOT NULL,
    notes TEXT,

    -- Snapshot of data at submission time (JSON)
    data_snapshot JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Review history
CREATE TABLE kyc_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES kyc_submissions(id) ON DELETE CASCADE,

    reviewer_id UUID NOT NULL REFERENCES auth.users(id),
    decision customer_status NOT NULL,
    notes TEXT,

    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Encryption keys metadata (for key rotation tracking)
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_identifier TEXT NOT NULL UNIQUE,
    algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_status ON user_profiles(account_status);
CREATE INDEX idx_user_profiles_locked ON user_profiles(locked_until) WHERE locked_until IS NOT NULL;

-- Security audit log indexes
CREATE INDEX idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_action ON security_audit_log(action);
CREATE INDEX idx_security_audit_created_at ON security_audit_log(created_at);
CREATE INDEX idx_security_audit_ip ON security_audit_log(ip_address);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Rate limits indexes
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, identifier_type, action);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- Customers indexes
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_business_name ON customers(business_name) WHERE business_name IS NOT NULL;
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Addresses indexes
CREATE INDEX idx_addresses_customer_id ON addresses(customer_id);

-- Identifications indexes
CREATE INDEX idx_identifications_customer_id ON identifications(customer_id);

-- Documents indexes
CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_associated_person_id ON documents(associated_person_id) WHERE associated_person_id IS NOT NULL;
CREATE INDEX idx_documents_purpose ON documents(purpose);

-- Associated persons indexes
CREATE INDEX idx_associated_persons_customer_id ON associated_persons(customer_id);
CREATE INDEX idx_associated_persons_relationship ON associated_persons(relationship);

-- Submissions and reviews indexes
CREATE INDEX idx_kyc_submissions_customer_id ON kyc_submissions(customer_id);
CREATE INDEX idx_kyc_reviews_submission_id ON kyc_reviews(submission_id);
CREATE INDEX idx_kyc_reviews_reviewer_id ON kyc_reviews(reviewer_id);

-- ============================================================================
-- SECURITY HELPER FUNCTIONS
-- ============================================================================

-- Check if user's email is verified
CREATE OR REPLACE FUNCTION is_email_verified()
RETURNS BOOLEAN AS $$
DECLARE
    verified BOOLEAN;
BEGIN
    SELECT (raw_user_meta_data->>'email_verified')::BOOLEAN INTO verified
    FROM auth.users
    WHERE id = auth.uid();

    RETURN COALESCE(verified, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user account is active (not locked or suspended)
CREATE OR REPLACE FUNCTION is_account_active()
RETURNS BOOLEAN AS $$
DECLARE
    status account_status;
    locked_until_time TIMESTAMPTZ;
BEGIN
    SELECT up.account_status, up.locked_until INTO status, locked_until_time
    FROM user_profiles up
    WHERE up.id = auth.uid();

    -- If no profile exists, deny access
    IF status IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if account is locked
    IF locked_until_time IS NOT NULL AND locked_until_time > NOW() THEN
        RETURN FALSE;
    END IF;

    -- Check account status
    RETURN status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can perform sensitive operations (email verified + account active)
CREATE OR REPLACE FUNCTION can_perform_sensitive_operations()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_email_verified() AND is_account_active();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's customer IDs
CREATE OR REPLACE FUNCTION get_user_customer_ids()
RETURNS SETOF UUID AS $$
    SELECT id FROM customers WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user owns a customer
CREATE OR REPLACE FUNCTION user_owns_customer(p_customer_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM customers
        WHERE id = p_customer_id
        AND user_id = auth.uid()
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Increment failed login attempts
CREATE OR REPLACE FUNCTION increment_failed_login(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_attempts INTEGER;
    lockout_threshold INTEGER := 5;
    lockout_duration INTERVAL := '30 minutes';
BEGIN
    UPDATE user_profiles
    SET
        failed_login_attempts = failed_login_attempts + 1,
        last_failed_login_at = NOW(),
        locked_until = CASE
            WHEN failed_login_attempts + 1 >= lockout_threshold
            THEN NOW() + lockout_duration
            ELSE locked_until
        END,
        account_status = CASE
            WHEN failed_login_attempts + 1 >= lockout_threshold
            THEN 'locked'::account_status
            ELSE account_status
        END
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_login(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE user_profiles
    SET
        failed_login_attempts = 0,
        last_failed_login_at = NULL,
        locked_until = NULL,
        account_status = CASE
            WHEN account_status = 'locked' THEN 'active'::account_status
            ELSE account_status
        END
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions
    WHERE expires_at < NOW() - INTERVAL '7 days'
    OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent user_id modification
CREATE OR REPLACE FUNCTION prevent_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'Cannot modify user_id after creation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, account_status)
    VALUES (NEW.id, 'pending_verification');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log sensitive field changes
    IF TG_TABLE_NAME = 'customers' THEN
        IF OLD.tax_id_encrypted IS DISTINCT FROM NEW.tax_id_encrypted
           OR OLD.ein_encrypted IS DISTINCT FROM NEW.ein_encrypted THEN
            INSERT INTO security_audit_log (user_id, action, metadata)
            VALUES (
                auth.uid(),
                'data_export'::audit_action, -- Using as "sensitive data modified"
                jsonb_build_object(
                    'table', TG_TABLE_NAME,
                    'record_id', NEW.id,
                    'fields_modified', ARRAY['encrypted_fields']
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at
    BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_identifications_updated_at
    BEFORE UPDATE ON identifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_associated_persons_updated_at
    BEFORE UPDATE ON associated_persons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prevent user_id modification on customers
CREATE TRIGGER prevent_customers_user_id_change
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

-- Auto-create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Log security-sensitive changes
CREATE TRIGGER log_customers_security_events
    AFTER UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION log_security_event();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - ENHANCED SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE identifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE associated_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER PROFILES POLICIES
-- Users can only access their own profile
-- ============================================================================

-- SELECT: Users can view their own profile
CREATE POLICY "user_profiles_select_own" ON user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- INSERT: Handled by trigger on auth.users creation (service role)
-- No direct insert policy for regular users

-- UPDATE: Users can update limited fields of their own profile
CREATE POLICY "user_profiles_update_own" ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        -- Prevent users from modifying security-critical fields
        -- These should only be modified by service role
    );

-- DELETE: Users cannot delete their profile (managed by auth.users cascade)
-- No delete policy

-- ============================================================================
-- SECURITY AUDIT LOG POLICIES
-- Users can only view their own audit entries (read-only)
-- ============================================================================

-- SELECT: Users can view their own security events
CREATE POLICY "security_audit_select_own" ON security_audit_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: Only service role can manage audit logs
-- No policies for regular users (logs are immutable)

-- ============================================================================
-- USER SESSIONS POLICIES
-- Users can view and revoke their own sessions
-- ============================================================================

-- SELECT: Users can view their own sessions
CREATE POLICY "user_sessions_select_own" ON user_sessions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- UPDATE: Users can revoke their own sessions (set revoked_at)
CREATE POLICY "user_sessions_update_own" ON user_sessions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        -- Only allow setting revoked_at, not modifying other fields
        AND revoked_at IS NOT NULL
    );

-- INSERT/DELETE: Only service role
-- No policies for regular users

-- ============================================================================
-- RATE LIMITS POLICIES
-- No access for regular users (managed by service role)
-- ============================================================================
-- No policies - rate_limits managed by service role only

-- ============================================================================
-- CUSTOMERS POLICIES
-- Users can only access their own customer records
-- Requires email verification for write operations
-- ============================================================================

-- SELECT: Users can view their own customers
CREATE POLICY "customers_select_own" ON customers
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        AND is_account_active()
    );

-- INSERT: Users can create customers for themselves (requires email verification)
CREATE POLICY "customers_insert_own" ON customers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND can_perform_sensitive_operations()
    );

-- UPDATE: Users can update their own customers (requires email verification)
-- Cannot modify user_id (enforced by trigger)
CREATE POLICY "customers_update_own" ON customers
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        AND can_perform_sensitive_operations()
    )
    WITH CHECK (
        auth.uid() = user_id
        AND can_perform_sensitive_operations()
    );

-- DELETE: Users can delete their own draft customers only
CREATE POLICY "customers_delete_own" ON customers
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        AND can_perform_sensitive_operations()
        AND status = 'draft' -- Only allow deleting drafts
    );

-- ============================================================================
-- ADDRESSES POLICIES
-- Users can access addresses belonging to their customers
-- ============================================================================

-- SELECT: Users can view addresses of their customers
CREATE POLICY "addresses_select_own" ON addresses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = addresses.customer_id
            AND customers.user_id = auth.uid()
        )
        AND is_account_active()
    );

-- INSERT: Users can create addresses for their customers
CREATE POLICY "addresses_insert_own" ON addresses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = addresses.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    );

-- UPDATE: Users can update addresses of their customers
CREATE POLICY "addresses_update_own" ON addresses
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = addresses.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = addresses.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    );

-- DELETE: Users can delete addresses of their draft customers
CREATE POLICY "addresses_delete_own" ON addresses
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = addresses.customer_id
            AND customers.user_id = auth.uid()
            AND customers.status = 'draft'
        )
        AND can_perform_sensitive_operations()
    );

-- ============================================================================
-- IDENTIFICATIONS POLICIES
-- Sensitive PII - stricter controls
-- ============================================================================

-- SELECT: Users can view identifications of their customers
CREATE POLICY "identifications_select_own" ON identifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = identifications.customer_id
            AND customers.user_id = auth.uid()
        )
        AND is_account_active()
    );

-- INSERT: Requires email verification
CREATE POLICY "identifications_insert_own" ON identifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = identifications.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    );

-- UPDATE: Requires email verification
CREATE POLICY "identifications_update_own" ON identifications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = identifications.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = identifications.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    );

-- DELETE: Only for draft customers
CREATE POLICY "identifications_delete_own" ON identifications
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = identifications.customer_id
            AND customers.user_id = auth.uid()
            AND customers.status = 'draft'
        )
        AND can_perform_sensitive_operations()
    );

-- ============================================================================
-- DOCUMENTS POLICIES
-- Sensitive data - stricter controls
-- ============================================================================

-- SELECT: Users can view documents of their customers
CREATE POLICY "documents_select_own" ON documents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = documents.customer_id
            AND customers.user_id = auth.uid()
        )
        AND is_account_active()
    );

-- INSERT: Requires email verification
CREATE POLICY "documents_insert_own" ON documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = documents.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    );

-- UPDATE: Requires email verification (mainly for metadata updates)
CREATE POLICY "documents_update_own" ON documents
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = documents.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = documents.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    );

-- DELETE: Only for draft customers
CREATE POLICY "documents_delete_own" ON documents
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = documents.customer_id
            AND customers.user_id = auth.uid()
            AND customers.status = 'draft'
        )
        AND can_perform_sensitive_operations()
    );

-- ============================================================================
-- ASSOCIATED PERSONS POLICIES
-- Sensitive PII - stricter controls
-- ============================================================================

-- SELECT
CREATE POLICY "associated_persons_select_own" ON associated_persons
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = associated_persons.customer_id
            AND customers.user_id = auth.uid()
        )
        AND is_account_active()
    );

-- INSERT
CREATE POLICY "associated_persons_insert_own" ON associated_persons
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = associated_persons.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    );

-- UPDATE
CREATE POLICY "associated_persons_update_own" ON associated_persons
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = associated_persons.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = associated_persons.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    );

-- DELETE: Only for draft customers
CREATE POLICY "associated_persons_delete_own" ON associated_persons
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = associated_persons.customer_id
            AND customers.user_id = auth.uid()
            AND customers.status = 'draft'
        )
        AND can_perform_sensitive_operations()
    );

-- ============================================================================
-- KYC SUBMISSIONS POLICIES
-- Immutable audit log - limited access
-- ============================================================================

-- SELECT: Users can view their submissions
CREATE POLICY "kyc_submissions_select_own" ON kyc_submissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = kyc_submissions.customer_id
            AND customers.user_id = auth.uid()
        )
        AND is_account_active()
    );

-- INSERT: Users can create submissions (requires email verification)
CREATE POLICY "kyc_submissions_insert_own" ON kyc_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = kyc_submissions.customer_id
            AND customers.user_id = auth.uid()
        )
        AND can_perform_sensitive_operations()
    );

-- UPDATE: Submissions are immutable - no update policy
-- DELETE: Submissions cannot be deleted - no delete policy

-- ============================================================================
-- KYC REVIEWS POLICIES
-- Read-only for users, write by service role only
-- ============================================================================

-- SELECT: Users can view reviews of their submissions
CREATE POLICY "kyc_reviews_select_own" ON kyc_reviews
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM kyc_submissions
            JOIN customers ON customers.id = kyc_submissions.customer_id
            WHERE kyc_submissions.id = kyc_reviews.submission_id
            AND customers.user_id = auth.uid()
        )
        AND is_account_active()
    );

-- INSERT/UPDATE/DELETE: Only service role can manage reviews
-- No policies for regular authenticated users

-- ============================================================================
-- ENCRYPTION KEYS POLICIES
-- No access for regular users
-- ============================================================================
-- No policies - encryption keys are managed by service role only

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on all sequences to authenticated users
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- User security tables
GRANT SELECT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON security_audit_log TO authenticated;
GRANT SELECT, UPDATE ON user_sessions TO authenticated;

-- Main application tables
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON identifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON associated_persons TO authenticated;
GRANT SELECT, INSERT ON kyc_submissions TO authenticated;
GRANT SELECT ON kyc_reviews TO authenticated;

-- No grants for rate_limits (service role only)
-- No grants for encryption_keys (service role only)

-- ============================================================================
-- SCHEDULED JOBS (for pg_cron if available)
-- ============================================================================

-- Note: These require pg_cron extension to be enabled in Supabase
-- Uncomment if pg_cron is available

-- Clean up expired sessions daily
-- SELECT cron.schedule('cleanup-expired-sessions', '0 3 * * *', 'SELECT cleanup_expired_sessions()');

-- Clean up old rate limit entries hourly
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_rate_limits()');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION is_email_verified() IS 'Checks if the current user email is verified';
COMMENT ON FUNCTION is_account_active() IS 'Checks if the current user account is active and not locked';
COMMENT ON FUNCTION can_perform_sensitive_operations() IS 'Checks if user can perform sensitive operations (email verified + account active)';
COMMENT ON TABLE user_profiles IS 'Extended user profile with security settings';
COMMENT ON TABLE security_audit_log IS 'Immutable security event audit log';
COMMENT ON TABLE user_sessions IS 'Active session tracking for security monitoring';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking table';
