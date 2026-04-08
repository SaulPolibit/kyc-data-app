import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicLinkInfo,
  startLinkSession,
  logLinkAccess,
} from '@/lib/supabase/links';
import { validateRequestIp } from '@/lib/security/ip-whitelist';

// Error codes for client-side translation
export const API_ERROR_CODES = {
  IP_ACCESS_DENIED: 'IP_ACCESS_DENIED',
  LINK_NOT_FOUND: 'LINK_NOT_FOUND',
  LINK_EXPIRED: 'LINK_EXPIRED',
  FETCH_LINK_FAILED: 'FETCH_LINK_FAILED',
  CREATE_SESSION_FAILED: 'CREATE_SESSION_FAILED',
  RETRIEVE_SESSION_FAILED: 'RETRIEVE_SESSION_FAILED',
  START_SESSION_FAILED: 'START_SESSION_FAILED',
} as const;

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET /api/public/link/[token] - Get public link info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate IP whitelist
    const ipValidation = validateRequestIp(request.headers);
    if (!ipValidation.allowed) {
      return NextResponse.json(
        { error: API_ERROR_CODES.IP_ACCESS_DENIED, details: ipValidation.reason },
        { status: 403 }
      );
    }

    const { token } = await params;
    const linkInfo = await getPublicLinkInfo(token);

    console.log('Link info for token:', token, linkInfo);

    if (!linkInfo) {
      return NextResponse.json(
        { error: API_ERROR_CODES.LINK_NOT_FOUND },
        { status: 404 }
      );
    }

    if (!linkInfo.is_valid) {
      // Log additional debug info
      console.log('Link marked as invalid:', {
        id: linkInfo.id,
        is_valid: linkInfo.is_valid,
        link_type: linkInfo.link_type,
      });
      return NextResponse.json(
        { error: API_ERROR_CODES.LINK_EXPIRED },
        { status: 410 }
      );
    }

    // Log access
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    const referer = request.headers.get('referer') || undefined;

    await logLinkAccess(linkInfo.id, 'view', undefined, ip, userAgent, referer);

    return NextResponse.json({ link: linkInfo });
  } catch (error) {
    console.error('Error fetching public link:', error);
    return NextResponse.json(
      { error: API_ERROR_CODES.FETCH_LINK_FAILED },
      { status: 500 }
    );
  }
}

// POST /api/public/link/[token] - Start a new session
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate IP whitelist
    const ipValidation = validateRequestIp(request.headers);
    if (!ipValidation.allowed) {
      return NextResponse.json(
        { error: API_ERROR_CODES.IP_ACCESS_DENIED, details: ipValidation.reason },
        { status: 403 }
      );
    }

    const { token } = await params;
    const linkInfo = await getPublicLinkInfo(token);

    if (!linkInfo) {
      return NextResponse.json(
        { error: API_ERROR_CODES.LINK_NOT_FOUND },
        { status: 404 }
      );
    }

    if (!linkInfo.is_valid) {
      return NextResponse.json(
        { error: API_ERROR_CODES.LINK_EXPIRED },
        { status: 410 }
      );
    }

    // Get client info
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Create session
    const sessionId = await startLinkSession(linkInfo.id, ip, userAgent);

    if (!sessionId) {
      console.error('Failed to create session - no sessionId returned');
      return NextResponse.json(
        { error: API_ERROR_CODES.CREATE_SESSION_FAILED },
        { status: 500 }
      );
    }

    // Get session token
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: session, error: sessionError } = await supabase
      .from('link_sessions')
      .select('session_token, total_steps, expires_at')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Failed to fetch session after creation:', sessionError);
      return NextResponse.json(
        { error: API_ERROR_CODES.RETRIEVE_SESSION_FAILED },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session_token: session.session_token,
      total_steps: session.total_steps,
      expires_at: session.expires_at,
      link: linkInfo,
    });
  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json(
      { error: API_ERROR_CODES.START_SESSION_FAILED },
      { status: 500 }
    );
  }
}
