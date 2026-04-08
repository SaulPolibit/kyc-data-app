import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { AuthError } from '@/lib/auth/errors';
import { validateRequestIp } from '@/lib/security/ip-whitelist';
import { getSessionById, deleteSessionData } from '@/lib/supabase/links';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id] - Get session details including form data
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

    const session = await getSessionById(user.id, sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id] - Delete session data (form data and customer)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const success = await deleteSessionData(user.id, sessionId);

    if (!success) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Session data deleted successfully' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session data' },
      { status: 500 }
    );
  }
}
