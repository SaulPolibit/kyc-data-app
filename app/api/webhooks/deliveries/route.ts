import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AuthError } from '@/lib/auth/errors';
import { requireAuth } from '@/lib/auth/guards';
import { validateRequestIp } from '@/lib/security/ip-whitelist';

// GET /api/webhooks/deliveries - Get recent webhook deliveries
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

    // First get user's webhook IDs
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('id')
      .eq('user_id', user.id);

    if (webhooksError) throw webhooksError;

    const webhookIds = webhooks?.map(w => w.id) || [];

    if (webhookIds.length === 0) {
      return NextResponse.json({ deliveries: [] });
    }

    // Get recent deliveries for those webhooks
    const { data: deliveries, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .in('webhook_id', webhookIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ deliveries: deliveries || [] });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error fetching webhook deliveries:', error);
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
  }
}
