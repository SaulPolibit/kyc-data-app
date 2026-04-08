import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AuthError } from '@/lib/auth/errors';
import { requireAuth } from '@/lib/auth/guards';
import { validateRequestIp } from '@/lib/security/ip-whitelist';
import type { CreateWebhookRequest } from '@/types/webhooks';

// GET /api/webhooks - Get all webhooks for authenticated user
export async function GET() {
  try {
    // Validate IP whitelist
    const headersList = await headers();
    const ipValidation = validateRequestIp(headersList);
    if (!ipValidation.allowed) {
      return NextResponse.json(
        { error: ipValidation.reason || 'Access denied from your IP address' },
        { status: 403 }
      );
    }

    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ webhooks: webhooks || [] });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    // Validate IP whitelist
    const ipValidation = validateRequestIp(request.headers);
    if (!ipValidation.allowed) {
      return NextResponse.json(
        { error: ipValidation.reason || 'Access denied from your IP address' },
        { status: 403 }
      );
    }

    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const body: CreateWebhookRequest = await request.json();

    // Validate required fields
    if (!body.url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!body.events || body.events.length === 0) {
      return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: user.id,
        url: body.url,
        events: body.events,
        description: body.description,
        secret: body.secret,
        status: 'active',
        failure_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}
