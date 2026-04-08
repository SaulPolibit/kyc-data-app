import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { requireAuth } from '@/lib/auth/guards';
import { AuthError } from '@/lib/auth/errors';
import { validateRequestIp } from '@/lib/security/ip-whitelist';
import {
  createApiKey,
  getUserApiKeys,
  deleteApiKey,
  deactivateApiKey,
} from '@/lib/supabase/api-keys';
import type { CreateApiKeyRequest } from '@/types/api-keys';

// GET /api/api-keys - Get all API keys for authenticated user
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
    const keys = await getUserApiKeys(user.id);

    return NextResponse.json({ keys });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - Create a new API key
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
    const body: CreateApiKeyRequest = await request.json();

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }

    const apiKey = await createApiKey(user.id, {
      name: body.name.trim(),
      scopes: body.scopes,
      expires_at: body.expires_at,
    });

    return NextResponse.json(
      {
        key: apiKey,
        message: 'Save this API key securely. It will not be shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys - Delete an API key
export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    await deleteApiKey(user.id, keyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

// PATCH /api/api-keys - Deactivate an API key
export async function PATCH(request: NextRequest) {
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
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    if (body.action === 'deactivate') {
      await deactivateApiKey(user.id, body.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}
