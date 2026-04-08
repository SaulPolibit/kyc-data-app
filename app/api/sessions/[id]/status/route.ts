import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { AuthError } from '@/lib/auth/errors';
import { validateRequestIp } from '@/lib/security/ip-whitelist';
import { createClient } from '@supabase/supabase-js';
import {
  approveSession,
  rejectSession,
  getSessionWithStatus,
} from '@/lib/supabase/links';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/sessions/[id]/status - Approve or reject a session
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json();

    const { action, reason, notes } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get session and verify ownership
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get session with link to verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('link_sessions')
      .select(`
        *,
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
        { error: 'Unauthorized to modify this session' },
        { status: 403 }
      );
    }

    // Verify session is in submitted status
    if (session.status !== 'submitted') {
      return NextResponse.json(
        { error: `Cannot ${action} session with status: ${session.status}. Session must be in "submitted" status.` },
        { status: 400 }
      );
    }

    let success: boolean;
    if (action === 'approve') {
      success = await approveSession(sessionId, user.id, notes);
    } else {
      if (!reason) {
        return NextResponse.json(
          { error: 'Reason is required when rejecting a session' },
          { status: 400 }
        );
      }
      success = await rejectSession(sessionId, user.id, reason);
    }

    if (!success) {
      return NextResponse.json(
        { error: `Failed to ${action} session` },
        { status: 400 }
      );
    }

    // Get updated session
    const updatedSession = await getSessionWithStatus(session.session_token);

    return NextResponse.json({
      success: true,
      status: updatedSession?.status,
      status_changed_at: updatedSession?.status_changed_at,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    console.error('Error updating session status:', error);
    return NextResponse.json(
      { error: 'Failed to update session status' },
      { status: 500 }
    );
  }
}
