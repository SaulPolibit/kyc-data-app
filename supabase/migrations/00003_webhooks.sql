-- Migration: Webhooks functionality
-- Description: Add webhooks table for user-configured webhook endpoints

-- ============================================================================
-- WEBHOOKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT, -- Optional signing secret
  events TEXT[] NOT NULL DEFAULT '{}', -- Array of event types to subscribe to
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'failed')),
  description TEXT,
  failure_count INT NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);

-- ============================================================================
-- WEBHOOK DELIVERIES TABLE (for logging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INT,
  response_body TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for webhook lookups and time-based queries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Webhooks policies - users can only manage their own webhooks
CREATE POLICY webhooks_select_own ON webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY webhooks_insert_own ON webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY webhooks_update_own ON webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY webhooks_delete_own ON webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- Webhook deliveries policies - users can view deliveries for their webhooks
CREATE POLICY webhook_deliveries_select_own ON webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_deliveries.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

-- Service role can insert deliveries (for webhook sending)
CREATE POLICY webhook_deliveries_insert_service ON webhook_deliveries
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CLEANUP OLD DELIVERIES (optional scheduled job)
-- ============================================================================

-- Function to clean up old webhook deliveries (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_deliveries()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_deliveries
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
