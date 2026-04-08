import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { AuthError } from '@/lib/auth/errors';
import { validateRequestIp } from '@/lib/security/ip-whitelist';
import { createClient } from '@supabase/supabase-js';
import { getSessionStatusHistory } from '@/lib/supabase/links';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id]/history - Get session status history
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { id: sessionId } = await params;

    // Verify ownership through link
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get session with link to verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('link_sessions')
      .select(`
        id,
        session_token,
        status,
        status_changed_at,
        status_history,
        kyc_links!inner(user_id)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify user owns the link associated with this session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kyc_links = session.kyc_links as any;
    const linkUserId = Array.isArray(kyc_links) ? kyc_links[0]?.user_id : kyc_links?.user_id;
    if (linkUserId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this session' },
        { status: 403 }
      );
    }

    // Get detailed status history from audit log
    const history = await getSessionStatusHistory(sessionId);

    return NextResponse.json({
      session_id: session.id,
      current_status: session.status,
      status_changed_at: session.status_changed_at,
      // Inline history from session (for quick access)
      status_history: session.status_history || [],
      // Detailed audit log
      audit_log: history,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    console.error('Error fetching session history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session history' },
      { status: 500 }
    );
  }
}
