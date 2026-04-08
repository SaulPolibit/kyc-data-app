-- Migration: Strict Single Session for Links
-- Only ONE session can be active per link at a time

-- Update create_link_session to enforce single session
CREATE OR REPLACE FUNCTION create_link_session(
    p_link_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    new_session_id UUID;
    new_session_token TEXT;
    link_record RECORD;
    existing_session RECORD;
BEGIN
    -- Verify link is valid
    IF NOT is_link_valid(p_link_id) THEN
        RAISE EXCEPTION 'Link is not valid or has expired';
    END IF;

    -- Check for existing active session (not completed and not expired)
    SELECT * INTO existing_session
    FROM link_sessions
    WHERE link_id = p_link_id
      AND is_completed = FALSE
      AND expires_at > NOW()
    LIMIT 1;

    -- If there's an existing active session, return its token instead of creating new
    IF existing_session IS NOT NULL THEN
        -- Update last access time
        UPDATE link_sessions
        SET updated_at = NOW()
        WHERE id = existing_session.id;

        RETURN existing_session.session_token;
    END IF;

    -- Get link info for step count
    SELECT * INTO link_record FROM kyc_links WHERE id = p_link_id;

    -- Generate session token
    new_session_token := generate_link_token(48);

    -- Create session
    INSERT INTO link_sessions (
        link_id,
        session_token,
        total_steps,
        ip_address,
        user_agent
    ) VALUES (
        p_link_id,
        new_session_token,
        CASE WHEN link_record.link_type = 'business' THEN 5 ELSE 4 END,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO new_session_id;

    -- Log access
    INSERT INTO link_access_logs (link_id, session_id, action, ip_address, user_agent)
    VALUES (p_link_id, new_session_id, 'start', p_ip_address, p_user_agent);

    RETURN new_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if link has active session
CREATE OR REPLACE FUNCTION link_has_active_session(p_link_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM link_sessions
        WHERE link_id = p_link_id
          AND is_completed = FALSE
          AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION link_has_active_session(UUID) TO anon;
GRANT EXECUTE ON FUNCTION link_has_active_session(UUID) TO authenticated;
