// API Keys Types for External Integrations

export type ApiKeyScope = 'links:create' | 'links:read' | 'links:update' | 'links:delete' | 'sessions:read';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Response when creating a new API key (includes the full key only once)
export interface ApiKeyWithSecret extends ApiKey {
  key: string; // Full key, only returned on creation
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: ApiKeyScope[];
  expires_at?: string;
}

export interface ApiKeyUsageLog {
  id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  ip_address?: string;
  user_agent?: string;
  response_status?: number;
  created_at: string;
}

// Validated API key result from database function
export interface ValidatedApiKey {
  user_id: string;
  api_key_id: string;
  scopes: ApiKeyScope[];
}

// External API request to create a link
export interface ExternalCreateLinkRequest {
  type: 'individual' | 'business';
  external_id?: string;
  redirect_url?: string;
  webhook_url?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// External API response
export interface ExternalCreateLinkResponse {
  success: boolean;
  link_id: string;
  token: string;
  type: 'individual' | 'business';
  external_id?: string;
  urls: {
    form: string;      // Direct link to the form
    embed: string;     // URL for iframe embedding
  };
  embed_code: string;  // Ready-to-use iframe HTML
  expires_at?: string;
  created_at: string;
}

export interface ExternalApiError {
  success: false;
  error: string;
  code: string;
}

// Common API error codes
export type ApiErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'INSUFFICIENT_SCOPE'
  | 'IP_NOT_WHITELISTED'
  | 'INVALID_TYPE'
  | 'INTERNAL_ERROR';
