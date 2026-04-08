import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type {
  ApiKey,
  ApiKeyWithSecret,
  CreateApiKeyRequest,
  ValidatedApiKey,
  ApiKeyUsageLog,
} from '@/types/api-keys';

// Server-side client with service role
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey);
}

// ============================================================================
// API Key Generation
// ============================================================================

/**
 * Generate a new API key
 * Format: kycapp_[32 random chars]
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomBytes = crypto.randomBytes(24).toString('base64url');
  const key = `kycapp_${randomBytes}`;
  const prefix = key.substring(0, 12);
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

/**
 * Hash an API key for validation
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ============================================================================
// API Key CRUD Operations
// ============================================================================

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  data: CreateApiKeyRequest
): Promise<ApiKeyWithSecret> {
  const supabase = getSupabaseAdmin();
  const { key, prefix, hash } = generateApiKey();

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name: data.name,
      key_hash: hash,
      key_prefix: prefix,
      scopes: data.scopes || ['links:create', 'links:read'],
      expires_at: data.expires_at,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...apiKey,
    key, // Return the full key only on creation
  };
}

/**
 * Get all API keys for a user (without the actual key)
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete an API key
 */
export async function deleteApiKey(userId: string, keyId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Deactivate an API key
 */
export async function deactivateApiKey(userId: string, keyId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================================================
// API Key Validation
// ============================================================================

/**
 * Validate an API key and return user info
 */
export async function validateApiKey(apiKey: string): Promise<ValidatedApiKey | null> {
  const supabase = getSupabaseAdmin();
  const keyHash = hashApiKey(apiKey);

  const { data, error } = await supabase.rpc('validate_api_key', {
    p_key_hash: keyHash,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  ipAddress?: string,
  userAgent?: string,
  responseStatus?: number
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase.rpc('log_api_key_usage', {
    p_api_key_id: apiKeyId,
    p_endpoint: endpoint,
    p_method: method,
    p_ip_address: ipAddress || null,
    p_user_agent: userAgent || null,
    p_response_status: responseStatus || null,
  });
}

/**
 * Get API key usage logs
 */
export async function getApiKeyUsageLogs(
  userId: string,
  keyId?: string,
  limit: number = 100
): Promise<ApiKeyUsageLog[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('api_key_usage_log')
    .select('*, api_keys!inner(user_id)')
    .eq('api_keys.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (keyId) {
    query = query.eq('api_key_id', keyId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Extract API key from request headers
 */
export function extractApiKeyFromHeaders(headers: Headers): string | null {
  // Check X-API-Key header first
  const apiKey = headers.get('X-API-Key');
  if (apiKey) return apiKey;

  // Check Authorization header (Bearer token style)
  const authHeader = headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('kycapp_')) {
      return token;
    }
  }

  return null;
}
