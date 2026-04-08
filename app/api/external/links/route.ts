import { NextRequest, NextResponse } from 'next/server';
import { createLink } from '@/lib/supabase/links';
import {
  validateApiKey,
  logApiKeyUsage,
  extractApiKeyFromHeaders,
} from '@/lib/supabase/api-keys';
import { validateRequestIp } from '@/lib/security/ip-whitelist';
import type {
  ExternalCreateLinkRequest,
  ExternalCreateLinkResponse,
  ExternalApiError,
} from '@/types/api-keys';

// POST /api/external/links - Create a new KYC/KYB link via API key
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let apiKeyId: string | undefined;

  try {
    // Validate IP whitelist first
    const ipValidation = validateRequestIp(request.headers);
    if (!ipValidation.allowed) {
      return NextResponse.json<ExternalApiError>(
        {
          success: false,
          error: ipValidation.reason || 'IP address not allowed.',
          code: 'IP_NOT_WHITELISTED',
        },
        { status: 403 }
      );
    }

    // Extract API key from headers
    const apiKey = extractApiKeyFromHeaders(request.headers);

    if (!apiKey) {
      return NextResponse.json<ExternalApiError>(
        {
          success: false,
          error: 'Missing API key. Provide it via X-API-Key header or Authorization: Bearer token.',
          code: 'MISSING_API_KEY',
        },
        { status: 401 }
      );
    }

    // Validate API key
    const validatedKey = await validateApiKey(apiKey);

    if (!validatedKey) {
      return NextResponse.json<ExternalApiError>(
        {
          success: false,
          error: 'Invalid or expired API key.',
          code: 'INVALID_API_KEY',
        },
        { status: 401 }
      );
    }

    apiKeyId = validatedKey.api_key_id;

    // Check scope
    if (!validatedKey.scopes.includes('links:create')) {
      return NextResponse.json<ExternalApiError>(
        {
          success: false,
          error: 'API key does not have permission to create links.',
          code: 'INSUFFICIENT_SCOPE',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body: ExternalCreateLinkRequest = await request.json();

    // Validate required fields
    if (!body.type || !['individual', 'business'].includes(body.type)) {
      return NextResponse.json<ExternalApiError>(
        {
          success: false,
          error: 'Invalid type. Must be "individual" or "business".',
          code: 'INVALID_TYPE',
        },
        { status: 400 }
      );
    }

    // Create the link
    const link = await createLink(validatedKey.user_id, {
      link_type: body.type,
      external_id: body.external_id,
      redirect_url: body.redirect_url,
      webhook_url: body.webhook_url,
      title: body.title,
      description: body.description,
      metadata: body.metadata,
    });

    // Generate URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const formUrl = `${baseUrl}/kyc/${link.token}`;
    const embedUrl = `${baseUrl}/embed/${link.token}`;

    const embedCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="800"
  frameborder="0"
  allow="camera; microphone"
  style="border: none; max-width: 100%;"
></iframe>`;

    // Log successful usage
    await logApiKeyUsage(
      apiKeyId,
      '/api/external/links',
      'POST',
      ipValidation.clientIp || undefined,
      request.headers.get('user-agent') || undefined,
      201
    );

    return NextResponse.json<ExternalCreateLinkResponse>(
      {
        success: true,
        link_id: link.id,
        token: link.token,
        type: body.type,
        external_id: body.external_id,
        urls: {
          form: formUrl,
          embed: embedUrl,
        },
        embed_code: embedCode,
        expires_at: link.expires_at,
        created_at: link.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('External API error:', error);

    // Log failed usage if we have the API key ID
    if (apiKeyId) {
      await logApiKeyUsage(
        apiKeyId,
        '/api/external/links',
        'POST',
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined,
        500
      );
    }

    return NextResponse.json<ExternalApiError>(
      {
        success: false,
        error: 'Failed to create link.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// GET /api/external/links - Get links for the API key owner
export async function GET(request: NextRequest) {
  try {
    // Validate IP whitelist first
    const ipValidation = validateRequestIp(request.headers);
    if (!ipValidation.allowed) {
      return NextResponse.json<ExternalApiError>(
        {
          success: false,
          error: ipValidation.reason || 'IP address not allowed.',
          code: 'IP_NOT_WHITELISTED',
        },
        { status: 403 }
      );
    }

    // Extract API key from headers
    const apiKey = extractApiKeyFromHeaders(request.headers);

    if (!apiKey) {
      return NextResponse.json<ExternalApiError>(
        {
          success: false,
          error: 'Missing API key. Provide it via X-API-Key header or Authorization: Bearer token.',
          code: 'MISSING_API_KEY',
        },
        { status: 401 }
      );
    }

    // Validate API key
    const validatedKey = await validateApiKey(apiKey);

    if (!validatedKey) {
      return NextResponse.json<ExternalApiError>(
        {
          success: false,
          error: 'Invalid or expired API key.',
          code: 'INVALID_API_KEY',
        },
        { status: 401 }
      );
    }

    // Check scope
    if (!validatedKey.scopes.includes('links:read')) {
      return NextResponse.json<ExternalApiError>(
        {
          success: false,
          error: 'API key does not have permission to read links.',
          code: 'INSUFFICIENT_SCOPE',
        },
        { status: 403 }
      );
    }

    // Import and use getUserLinks
    const { getUserLinks } = await import('@/lib/supabase/links');
    const links = await getUserLinks(validatedKey.user_id);

    // Log usage
    await logApiKeyUsage(
      validatedKey.api_key_id,
      '/api/external/links',
      'GET',
      ipValidation.clientIp || undefined,
      request.headers.get('user-agent') || undefined,
      200
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    return NextResponse.json({
      success: true,
      links: links.map((link) => ({
        link_id: link.id,
        token: link.token,
        type: link.link_type,
        status: link.status,
        external_id: link.external_id,
        title: link.title,
        urls: {
          form: `${baseUrl}/kyc/${link.token}`,
          embed: `${baseUrl}/embed/${link.token}`,
        },
        submission_count: link.submission_count,
        created_at: link.created_at,
        expires_at: link.expires_at,
      })),
    });
  } catch (error) {
    console.error('External API error:', error);
    return NextResponse.json<ExternalApiError>(
      {
        success: false,
        error: 'Failed to fetch links.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
