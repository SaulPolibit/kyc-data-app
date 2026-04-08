import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AuthError } from '@/lib/auth/errors';
import { requireAuth } from '@/lib/auth/guards';
import { validateRequestIp } from '@/lib/security/ip-whitelist';
import crypto from 'crypto';

// POST /api/webhooks/[id]/test - Send a test webhook
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate IP whitelist
    const ipValidation = validateRequestIp(request.headers);
    if (!ipValidation.allowed) {
      return NextResponse.json(
        { error: ipValidation.reason || 'Access denied from your IP address' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    // Get the webhook
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (webhookError || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Create test payload
    const payload = {
      event: 'test',
      data: {
        message: 'This is a test webhook from KYC Manager',
        webhook_id: webhook.id,
        timestamp: new Date().toISOString(),
      },
    };

    const payloadString = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': 'test',
      'X-Webhook-Timestamp': Date.now().toString(),
    };

    // Add signature if secret is configured
    if (webhook.secret) {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(payloadString)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    // Send the webhook
    const startTime = Date.now();
    let success = false;
    let responseStatus: number | undefined;
    let responseBody: string | undefined;
    let errorMessage: string | undefined;

    try {
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

    // Log the delivery
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      event: 'test',
      payload,
      response_status: responseStatus,
      response_body: responseBody?.substring(0, 1000),
      success,
      duration_ms: durationMs,
      error_message: errorMessage,
    });

    // Update last triggered timestamp
    await supabase
      .from('webhooks')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', id);

    if (success) {
      return NextResponse.json({
        success: true,
        status: responseStatus,
        duration_ms: durationMs,
      });
    } else {
      return NextResponse.json({
        success: false,
        status: responseStatus,
        error: errorMessage || `Response status: ${responseStatus}`,
        duration_ms: durationMs,
      });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error testing webhook:', error);
    return NextResponse.json({ error: 'Failed to test webhook' }, { status: 500 });
  }
}
