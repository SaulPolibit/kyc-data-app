import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createLink, getUserLinks } from '@/lib/supabase/links';
import { AuthError } from '@/lib/auth/errors';
import { requireAuth } from '@/lib/auth/guards';
import { validateRequestIp } from '@/lib/security/ip-whitelist';
import type { CreateLinkRequest } from '@/types/links';

// GET /api/links - Get all links for authenticated user
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
    const links = await getUserLinks(user.id);
    return NextResponse.json({ links });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    // Log full error details
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    console.error('Error fetching links:', JSON.stringify(errorDetails, null, 2));
    return NextResponse.json(
      { error: 'Failed to fetch links', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/links - Create a new KYC/KYB link (requires authenticated user)
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

    const body: CreateLinkRequest = await request.json();

    // Require authenticated user to create links
    const user = await requireAuth();

    // Validate required fields
    if (!body.link_type || !['individual', 'business'].includes(body.link_type)) {
      return NextResponse.json(
        { error: 'Invalid link_type. Must be "individual" or "business".' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (body.redirect_url && !isValidUrl(body.redirect_url)) {
      return NextResponse.json(
        { error: 'Invalid redirect_url' },
        { status: 400 }
      );
    }

    if (body.webhook_url && !isValidUrl(body.webhook_url)) {
      return NextResponse.json(
        { error: 'Invalid webhook_url' },
        { status: 400 }
      );
    }

    if (body.primary_color && !isValidHexColor(body.primary_color)) {
      return NextResponse.json(
        { error: 'Invalid primary_color. Must be a hex color.' },
        { status: 400 }
      );
    }

    const link = await createLink(user.id, body);

    // Generate URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const shareableUrl = `${baseUrl}/kyc/${link.token}`;
    const embedUrl = `${baseUrl}/embed/${link.token}`;

    return NextResponse.json({
      link,
      urls: {
        shareable: shareableUrl,
        embed: embedUrl,
      },
      embed_code: generateEmbedCode(embedUrl),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error creating link:', error);
    return NextResponse.json(
      { error: 'Failed to create link' },
      { status: 500 }
    );
  }
}

// Helper functions
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

function generateEmbedCode(embedUrl: string): string {
  return `<iframe
  src="${embedUrl}"
  width="100%"
  height="800"
  frameborder="0"
  allow="camera; microphone"
  style="border: none; max-width: 100%;"
></iframe>`;
}
