import { NextRequest, NextResponse } from 'next/server';
import {
  getLinkById,
  updateLink,
  deleteLink,
  getLinkSessions,
  getLinkAccessLogs,
  getLinkStatistics,
} from '@/lib/supabase/links';
import { AuthError } from '@/lib/auth/errors';
import { requireAuth } from '@/lib/auth/guards';
import { validateRequestIp } from '@/lib/security/ip-whitelist';
import type { UpdateLinkRequest } from '@/types/links';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/links/[id] - Get a specific link with details
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

    const { id } = await params;
    const link = await getLinkById(user.id, id);

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Get additional data based on query params
    const { searchParams } = new URL(request.url);
    const includeSessions = searchParams.get('include_sessions') === 'true';
    const includeLogs = searchParams.get('include_logs') === 'true';
    const includeStats = searchParams.get('include_stats') === 'true';

    const response: Record<string, unknown> = { link };

    if (includeSessions) {
      response.sessions = await getLinkSessions(user.id, id);
    }

    if (includeLogs) {
      response.access_logs = await getLinkAccessLogs(user.id, id);
    }

    if (includeStats) {
      response.statistics = await getLinkStatistics(user.id, id);
    }

    // Generate URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    response.urls = {
      shareable: `${baseUrl}/kyc/${link.token}`,
      embed: `${baseUrl}/embed/${link.token}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error fetching link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch link' },
      { status: 500 }
    );
  }
}

// PUT /api/links/[id] - Update a link
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body: UpdateLinkRequest = await request.json();

    // Check if link exists
    const existingLink = await getLinkById(user.id, id);
    if (!existingLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Validate status transition
    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        active: ['revoked'],
        completed: [],
        expired: [],
        revoked: ['active'],
      };

      if (!validTransitions[existingLink.status]?.includes(body.status)) {
        return NextResponse.json(
          { error: `Cannot change status from ${existingLink.status} to ${body.status}` },
          { status: 400 }
        );
      }
    }

    const link = await updateLink(user.id, id, body);
    return NextResponse.json({ link });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error updating link:', error);
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    );
  }
}

// DELETE /api/links/[id] - Delete a link and all associated data
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

    const { id } = await params;

    // Check if link exists
    const existingLink = await getLinkById(user.id, id);
    if (!existingLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Delete link and all associated data (sessions, form data, customers)
    await deleteLink(user.id, id);
    return NextResponse.json({
      success: true,
      message: 'Link and all associated data deleted successfully'
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    );
  }
}
