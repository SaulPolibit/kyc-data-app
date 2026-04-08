import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type {
  KycLink,
  LinkSession,
  LinkAccessLog,
  PublicLinkInfo,
  CreateLinkRequest,
  UpdateLinkRequest,
  LinkStatistics,
  SessionStatus,
} from '@/types/links';
import type { Webhook, SessionStatusChangedPayload, WebhookEvent } from '@/types/webhooks';
import type { SessionStatusLog } from '@/types/sessions';
import {
  encryptDocumentsInFormData,
  decryptDocumentsInFormData,
} from '@/lib/security/encryption';

// Server-side Supabase client (for API routes)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// Server-side client with service role (for server operations)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey);
}

// Calculate link expiration date based on LINK_EXPIRY_DAYS env var
function calculateLinkExpiration(): string | undefined {
  const expiryDays = parseInt(process.env.LINK_EXPIRY_DAYS || '0', 10);
  if (isNaN(expiryDays) || expiryDays <= 0) {
    return undefined; // No automatic expiration
  }
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expiryDays);
  return expirationDate.toISOString();
}

// ============================================================================
// AUTHENTICATED USER OPERATIONS (for link management)
// ============================================================================

export async function createLink(
  userId: string,
  data: CreateLinkRequest
): Promise<KycLink> {
  // Use admin client since we've already authenticated at the API level
  const supabase = getSupabaseAdmin();

  // Use provided expires_at or calculate from LINK_EXPIRY_DAYS env var
  const expiresAt = data.expires_at || calculateLinkExpiration();

  const { data: link, error } = await supabase
    .from('kyc_links')
    .insert({
      user_id: userId,
      link_type: data.link_type,
      access_type: data.access_type || 'single_use',
      title: data.title,
      description: data.description,
      redirect_url: data.redirect_url,
      webhook_url: data.webhook_url,
      logo_url: data.logo_url,
      primary_color: data.primary_color,
      allowed_domains: data.allowed_domains,
      expires_at: expiresAt,
      max_submissions: data.max_submissions,
      external_id: data.external_id,
      metadata: data.metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return link;
}

export async function getUserLinks(userId: string): Promise<KycLink[]> {
  const supabase = getSupabaseAdmin();

  const { data: links, error } = await supabase
    .from('kyc_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error in getUserLinks:', error);
    throw new Error(`Database error: ${error.message} (code: ${error.code})`);
  }
  return links || [];
}

export async function getLinkById(
  userId: string,
  linkId: string
): Promise<KycLink | null> {
  const supabase = getSupabaseAdmin();

  const { data: link, error } = await supabase
    .from('kyc_links')
    .select('*')
    .eq('id', linkId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return link;
}

export async function updateLink(
  userId: string,
  linkId: string,
  data: UpdateLinkRequest
): Promise<KycLink> {
  const supabase = getSupabaseAdmin();

  const { data: link, error } = await supabase
    .from('kyc_links')
    .update(data)
    .eq('id', linkId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return link;
}

export async function deleteLink(userId: string, linkId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // First, get all sessions for this link to find associated customers
  const { data: sessions } = await supabase
    .from('link_sessions')
    .select('id, customer_id')
    .eq('link_id', linkId);

  // Delete associated customers if they exist
  if (sessions && sessions.length > 0) {
    const customerIds = sessions
      .map(s => s.customer_id)
      .filter((id): id is string => id !== null);

    if (customerIds.length > 0) {
      await supabase
        .from('customers')
        .delete()
        .in('id', customerIds);
    }

    // Delete session status logs
    const sessionIds = sessions.map(s => s.id);
    await supabase
      .from('session_status_log')
      .delete()
      .in('session_id', sessionIds);
  }

  // Delete link access logs
  await supabase
    .from('link_access_logs')
    .delete()
    .eq('link_id', linkId);

  // Delete link sessions (this will also clear form_data)
  await supabase
    .from('link_sessions')
    .delete()
    .eq('link_id', linkId);

  // Finally, delete the link itself
  const { error } = await supabase
    .from('kyc_links')
    .delete()
    .eq('id', linkId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function revokeLink(userId: string, linkId: string): Promise<KycLink> {
  return updateLink(userId, linkId, { status: 'revoked' });
}

export async function getLinkSessions(
  userId: string,
  linkId: string
): Promise<LinkSession[]> {
  const supabase = getSupabaseAdmin();

  const { data: sessions, error } = await supabase
    .from('link_sessions')
    .select('*')
    .eq('link_id', linkId)
    .order('started_at', { ascending: false });

  if (error) throw error;

  // Decrypt sensitive document data in each session
  return (sessions || []).map((session) => {
    if (session.form_data) {
      session.form_data = decryptDocumentsInFormData(session.form_data as Record<string, unknown>);
    }
    return session;
  });
}

/**
 * Get a single session by ID with ownership verification
 */
export async function getSessionById(
  userId: string,
  sessionId: string
): Promise<LinkSession | null> {
  const supabase = getSupabaseAdmin();

  const { data: session, error } = await supabase
    .from('link_sessions')
    .select('*, kyc_links!inner(user_id)')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kyc_links = session.kyc_links as any;
  const linkUserId = Array.isArray(kyc_links) ? kyc_links[0]?.user_id : kyc_links?.user_id;
  if (linkUserId !== userId) {
    return null;
  }

  // Decrypt sensitive document data
  if (session && session.form_data) {
    session.form_data = decryptDocumentsInFormData(session.form_data as Record<string, unknown>);
  }

  return session;
}

/**
 * Delete session data (form_data and associated customer)
 */
export async function deleteSessionData(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // First verify ownership
  const session = await getSessionById(userId, sessionId);
  if (!session) {
    return false;
  }

  // Delete associated customer if exists
  if (session.customer_id) {
    await supabase
      .from('customers')
      .delete()
      .eq('id', session.customer_id);
  }

  // Clear form_data and mark as rejected (data deleted)
  const { error } = await supabase
    .from('link_sessions')
    .update({
      form_data: null,
      customer_id: null,
      status: 'rejected',
    })
    .eq('id', sessionId);

  if (error) throw error;
  return true;
}

export async function getLinkAccessLogs(
  userId: string,
  linkId: string
): Promise<LinkAccessLog[]> {
  const supabase = getSupabaseAdmin();

  const { data: logs, error } = await supabase
    .from('link_access_logs')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return logs || [];
}

export async function getLinkStatistics(
  userId: string,
  linkId: string
): Promise<LinkStatistics> {
  const supabase = getSupabaseAdmin();

  // Get access logs for statistics
  const { data: logs, error } = await supabase
    .from('link_access_logs')
    .select('action, created_at')
    .eq('link_id', linkId);

  if (error) throw error;

  const actions = logs || [];
  const views = actions.filter((l) => l.action === 'view').length;
  const starts = actions.filter((l) => l.action === 'start').length;
  const completions = actions.filter((l) => l.action === 'complete').length;

  return {
    total_views: views,
    total_starts: starts,
    total_completions: completions,
    completion_rate: starts > 0 ? (completions / starts) * 100 : 0,
  };
}

// ============================================================================
// PUBLIC/ANONYMOUS OPERATIONS (for embedded forms)
// ============================================================================

export async function getPublicLinkInfo(token: string): Promise<PublicLinkInfo | null> {
  const supabase = getSupabaseAdmin(); // Use admin client for public access

  // First, let's debug by getting the raw link data
  const { data: rawLink, error: rawError } = await supabase
    .from('kyc_links')
    .select('id, token, status, expires_at, max_submissions, submission_count, link_type')
    .eq('token', token)
    .single();

  if (rawLink) {
    console.log('Raw link data:', {
      id: rawLink.id,
      status: rawLink.status,
      expires_at: rawLink.expires_at,
      max_submissions: rawLink.max_submissions,
      submission_count: rawLink.submission_count,
      link_type: rawLink.link_type,
      is_expired: rawLink.expires_at ? new Date(rawLink.expires_at) < new Date() : false,
      is_over_limit: rawLink.max_submissions !== null && rawLink.submission_count >= rawLink.max_submissions,
    });
  } else {
    console.log('Raw link query error or not found:', rawError);
  }

  const { data, error } = await supabase.rpc('get_link_by_token', {
    p_token: token,
  });

  console.log('RPC get_link_by_token result:', { data, error });

  if (error || !data || data.length === 0) return null;
  return data[0];
}

export async function startLinkSession(
  linkId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc('create_link_session', {
    p_link_id: linkId,
    p_ip_address: ipAddress || null,
    p_user_agent: userAgent || null,
  });

  if (error) throw error;
  return data;
}

export async function getSessionByToken(sessionToken: string): Promise<LinkSession | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('link_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Decrypt sensitive document data
  if (data && data.form_data) {
    data.form_data = decryptDocumentsInFormData(data.form_data as Record<string, unknown>);
  }

  return data;
}

export async function updateSessionProgress(
  sessionToken: string,
  currentStep: number,
  formData: Record<string, unknown>
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  console.log('[updateSessionProgress] Called with step:', currentStep);
  console.log('[updateSessionProgress] Form data keys:', Object.keys(formData));

  // Encrypt sensitive document data before saving
  const encryptedFormData = encryptDocumentsInFormData(formData);

  const { data, error } = await supabase.rpc('update_link_session', {
    p_session_token: sessionToken,
    p_current_step: currentStep,
    p_form_data: encryptedFormData,
  });

  if (error) throw error;
  return data;
}

export async function completeSession(
  sessionToken: string,
  customerId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc('complete_link_session', {
    p_session_token: sessionToken,
    p_customer_id: customerId,
  });

  if (error) throw error;

  // Set data expiration based on DATA_STORED_EXPIRY_DAYS env var
  const dataExpiryDays = parseInt(process.env.DATA_STORED_EXPIRY_DAYS || '0', 10);
  if (!isNaN(dataExpiryDays) && dataExpiryDays > 0) {
    await supabase.rpc('set_session_data_expiry', {
      p_session_token: sessionToken,
      p_expiry_days: dataExpiryDays,
    });
  }

  return data;
}

export async function logLinkAccess(
  linkId: string,
  action: string,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string,
  referer?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('link_access_logs').insert({
    link_id: linkId,
    session_id: sessionId,
    action,
    ip_address: ipAddress,
    user_agent: userAgent,
    referer,
    metadata,
  });

  if (error) console.error('Failed to log link access:', error);
}

// ============================================================================
// WEBHOOK HELPERS
// ============================================================================

export async function sendWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error('Webhook failed:', error);
    return false;
  }
}

export async function notifyLinkCompletion(
  link: KycLink,
  session: LinkSession,
  customerId: string
): Promise<void> {
  if (!link.webhook_url) return;

  await sendWebhook(link.webhook_url, {
    event: 'kyc.completed',
    link_id: link.id,
    external_id: link.external_id,
    customer_id: customerId,
    session_id: session.id,
    link_type: link.link_type,
    completed_at: new Date().toISOString(),
    metadata: link.metadata,
  });
}

// ============================================================================
// SESSION STATUS TRANSITIONS
// ============================================================================

/**
 * Transition a session to a new status using the database function
 */
export async function transitionSessionStatus(
  sessionId: string,
  newStatus: SessionStatus,
  changedBy: string = 'system',
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc('transition_session_status', {
    p_session_id: sessionId,
    p_new_status: newStatus,
    p_changed_by: changedBy,
    p_reason: reason || null,
    p_metadata: metadata || null,
  });

  if (error) {
    console.error('Failed to transition session status:', error);
    return false;
  }

  return data === true;
}

/**
 * Get session with status info by token (uses new database function)
 */
export async function getSessionWithStatus(
  sessionToken: string
): Promise<LinkSession | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc('get_session_by_token', {
    p_session_token: sessionToken,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const session = data[0];

  // Decrypt sensitive document data
  if (session && session.form_data) {
    session.form_data = decryptDocumentsInFormData(session.form_data as Record<string, unknown>);
  }

  return session;
}

/**
 * Get session status history
 */
export async function getSessionStatusHistory(
  sessionId: string
): Promise<SessionStatusLog[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('session_status_log')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Approve a session (admin action)
 */
export async function approveSession(
  sessionId: string,
  reviewerId: string,
  notes?: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Get session to verify it's in submitted status
  const { data: session, error: sessionError } = await supabase
    .from('link_sessions')
    .select('*, kyc_links(user_id, external_id, metadata)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    console.error('Session not found:', sessionError);
    return false;
  }

  if (session.status !== 'submitted') {
    console.error('Session not in submitted status:', session.status);
    return false;
  }

  // Transition to approved
  const success = await transitionSessionStatus(
    sessionId,
    'approved',
    reviewerId,
    notes || 'Approved by reviewer'
  );

  if (!success) return false;

  // Update customer status if exists
  if (session.customer_id) {
    await supabase
      .from('customers')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq('id', session.customer_id);
  }

  // Trigger webhooks
  await triggerStatusChangeWebhooks(
    session,
    'submitted',
    'approved',
    reviewerId,
    notes
  );

  return true;
}

/**
 * Reject a session (admin action)
 */
export async function rejectSession(
  sessionId: string,
  reviewerId: string,
  reason: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Get session to verify it's in submitted status
  const { data: session, error: sessionError } = await supabase
    .from('link_sessions')
    .select('*, kyc_links(user_id, external_id, metadata)')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    console.error('Session not found:', sessionError);
    return false;
  }

  if (session.status !== 'submitted') {
    console.error('Session not in submitted status:', session.status);
    return false;
  }

  // Transition to rejected
  const success = await transitionSessionStatus(
    sessionId,
    'rejected',
    reviewerId,
    reason
  );

  if (!success) return false;

  // Update customer status if exists
  if (session.customer_id) {
    await supabase
      .from('customers')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq('id', session.customer_id);
  }

  // Trigger webhooks
  await triggerStatusChangeWebhooks(
    session,
    'submitted',
    'rejected',
    reviewerId,
    reason
  );

  return true;
}

// ============================================================================
// WEBHOOK INTEGRATION FOR STATUS CHANGES
// ============================================================================

/**
 * Send webhook with delivery logging and HMAC signature
 */
export async function sendWebhookWithDeliveryLog(
  webhook: Webhook,
  payload: Record<string, unknown>
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const startTime = Date.now();

  let success = false;
  let responseStatus: number | undefined;
  let responseBody: string | undefined;
  let errorMessage: string | undefined;

  try {
    const payloadString = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': (payload.event as string) || 'unknown',
      'X-Webhook-Timestamp': Date.now().toString(),
    };

    // Add HMAC signature if secret exists
    if (webhook.secret) {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(payloadString)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
    });

    responseStatus = response.status;
    responseBody = await response.text().catch(() => '');
    success = response.ok;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Request failed';
  }

  const durationMs = Date.now() - startTime;

  // Log delivery
  await supabase.from('webhook_deliveries').insert({
    webhook_id: webhook.id,
    event: payload.event as string,
    payload,
    response_status: responseStatus,
    response_body: responseBody?.substring(0, 1000),
    success,
    duration_ms: durationMs,
    error_message: errorMessage,
  });

  // Update webhook status based on result
  if (success) {
    await supabase
      .from('webhooks')
      .update({
        failure_count: 0,
        last_triggered_at: new Date().toISOString(),
      })
      .eq('id', webhook.id);
  } else {
    // Increment failure count
    const newFailureCount = webhook.failure_count + 1;
    await supabase
      .from('webhooks')
      .update({
        failure_count: newFailureCount,
        status: newFailureCount >= 5 ? 'failed' : webhook.status,
      })
      .eq('id', webhook.id);
  }

  return success;
}

/**
 * Trigger webhooks for session status changes
 */
export async function triggerStatusChangeWebhooks(
  session: LinkSession & { kyc_links?: { user_id: string; external_id?: string; metadata?: Record<string, unknown> } },
  previousStatus: SessionStatus,
  newStatus: SessionStatus,
  changedBy: string = 'system',
  reason?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get link info if not embedded in session
  let linkUserId: string;
  let externalId: string | undefined;
  let linkMetadata: Record<string, unknown> | undefined;

  if (session.kyc_links) {
    linkUserId = session.kyc_links.user_id;
    externalId = session.kyc_links.external_id;
    linkMetadata = session.kyc_links.metadata;
  } else {
    const { data: link } = await supabase
      .from('kyc_links')
      .select('user_id, external_id, metadata')
      .eq('id', session.link_id)
      .single();

    if (!link) return;
    linkUserId = link.user_id;
    externalId = link.external_id;
    linkMetadata = link.metadata;
  }

  // Determine which events to trigger
  const events: WebhookEvent[] = ['session.status_changed'];

  if (newStatus === 'submitted') events.push('session.submitted');
  if (newStatus === 'approved') events.push('session.approved');
  if (newStatus === 'rejected') events.push('session.rejected');

  // Get user's webhooks that subscribe to these events
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', linkUserId)
    .eq('status', 'active')
    .overlaps('events', events);

  if (!webhooks || webhooks.length === 0) return;

  // Build payload
  const payload: SessionStatusChangedPayload = {
    event: 'session.status_changed',
    session_id: session.id,
    link_id: session.link_id,
    external_id: externalId,
    customer_id: session.customer_id,
    previous_status: previousStatus,
    new_status: newStatus,
    changed_at: new Date().toISOString(),
    changed_by: changedBy,
    reason,
    metadata: linkMetadata,
  };

  // Send to each webhook
  for (const webhook of webhooks) {
    // Check if webhook subscribes to at least one of our events
    const subscribedEvents = webhook.events as WebhookEvent[];
    const hasMatchingEvent = events.some((e) => subscribedEvents.includes(e));

    if (hasMatchingEvent) {
      // Set the most specific event type for the payload
      if (newStatus === 'approved' && subscribedEvents.includes('session.approved')) {
        payload.event = 'session.approved';
      } else if (newStatus === 'rejected' && subscribedEvents.includes('session.rejected')) {
        payload.event = 'session.rejected';
      } else if (newStatus === 'submitted' && subscribedEvents.includes('session.submitted')) {
        payload.event = 'session.submitted';
      }

      await sendWebhookWithDeliveryLog(webhook, payload as unknown as Record<string, unknown>);
    }
  }
}
