/**
 * IP Whitelist Validation Utilities
 *
 * Provides functions to validate IP addresses against a global whitelist
 * configured via the ALLOWED_IPS environment variable.
 *
 * Environment Variable Format:
 * ALLOWED_IPS=192.168.1.1,10.0.0.0/8,203.0.113.0/24
 *
 * Supports:
 * - Single IP addresses (e.g., "192.168.1.1")
 * - CIDR notation ranges (e.g., "10.0.0.0/8")
 * - Empty/unset means all IPs are allowed
 */

/**
 * Parse an IPv4 address into a numeric value
 */
function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    result = (result << 8) + num;
  }
  return result >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Check if an IP address is a valid IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;

  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Check if an IP address is a valid IPv6 address
 */
export function isValidIPv6(ip: string): boolean {
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(:[0-9a-fA-F]{1,4}){1,6}$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^::$/;
  return ipv6Regex.test(ip);
}

/**
 * Check if a string is a valid IP address (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip);
}

/**
 * Parse a CIDR notation string (e.g., "192.168.1.0/24")
 */
function parseCIDR(cidr: string): { ip: string; maskBits: number } | null {
  const parts = cidr.split('/');
  if (parts.length !== 2) return null;

  const ip = parts[0];
  const maskBits = parseInt(parts[1], 10);

  if (!isValidIPv4(ip)) return null;
  if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) return null;

  return { ip, maskBits };
}

/**
 * Check if an IP address matches a CIDR range
 */
function ipMatchesCIDR(ip: string, cidr: string): boolean {
  const parsed = parseCIDR(cidr);
  if (!parsed) return false;

  const ipNum = ipv4ToNumber(ip);
  const networkNum = ipv4ToNumber(parsed.ip);

  if (ipNum === null || networkNum === null) return false;

  const mask = parsed.maskBits === 0 ? 0 : (~0 << (32 - parsed.maskBits)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
}

/**
 * Check if an IP address matches a whitelist entry (IP or CIDR)
 */
function ipMatchesEntry(clientIp: string, entry: string): boolean {
  const trimmedEntry = entry.trim();

  if (trimmedEntry.includes('/')) {
    return ipMatchesCIDR(clientIp, trimmedEntry);
  }

  return clientIp === trimmedEntry;
}

/**
 * Get the whitelist from environment variable
 * Returns an array of IP/CIDR entries, or empty array if not set
 */
export function getWhitelistFromEnv(): string[] {
  const allowedIps = process.env.ALLOWED_IPS;

  if (!allowedIps || allowedIps.trim() === '') {
    return [];
  }

  return allowedIps
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
}

/**
 * Check if IP whitelist is enabled (has entries)
 */
export function isWhitelistEnabled(): boolean {
  return getWhitelistFromEnv().length > 0;
}

/**
 * Validate an IP address against the global whitelist
 * Returns true if allowed, false if blocked
 */
export function isIpWhitelisted(clientIp: string): boolean {
  const whitelist = getWhitelistFromEnv();

  // No whitelist configured = allow all
  if (whitelist.length === 0) {
    return true;
  }

  const normalizedIp = clientIp.trim();
  return whitelist.some(entry => ipMatchesEntry(normalizedIp, entry));
}

/**
 * Extract client IP from request headers
 * Handles various proxy scenarios (X-Forwarded-For, X-Real-IP, etc.)
 */
export function extractClientIp(headers: Headers): string | null {
  // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0 && isValidIP(ips[0])) {
      return ips[0];
    }
  }

  // X-Real-IP is set by some reverse proxies (nginx)
  const realIp = headers.get('x-real-ip');
  if (realIp && isValidIP(realIp.trim())) {
    return realIp.trim();
  }

  // CF-Connecting-IP is set by Cloudflare
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && isValidIP(cfIp.trim())) {
    return cfIp.trim();
  }

  // True-Client-IP is another header used by some CDNs
  const trueClientIp = headers.get('true-client-ip');
  if (trueClientIp && isValidIP(trueClientIp.trim())) {
    return trueClientIp.trim();
  }

  return null;
}

/**
 * Result of IP whitelist validation
 */
export interface IpValidationResult {
  allowed: boolean;
  clientIp: string | null;
  reason?: string;
}

/**
 * Validate a request against the global IP whitelist
 * Returns a detailed result object
 */
export function validateRequestIp(headers: Headers): IpValidationResult {
  // If whitelist is not enabled, allow all
  if (!isWhitelistEnabled()) {
    return { allowed: true, clientIp: extractClientIp(headers) };
  }

  // Extract client IP
  const clientIp = extractClientIp(headers);

  // If we can't determine client IP, deny by default for security
  if (!clientIp) {
    return {
      allowed: false,
      clientIp: null,
      reason: 'Unable to determine client IP address',
    };
  }

  // Check if IP is whitelisted
  const isAllowed = isIpWhitelisted(clientIp);

  return {
    allowed: isAllowed,
    clientIp,
    reason: isAllowed ? undefined : `IP address ${clientIp} is not in the whitelist`,
  };
}
