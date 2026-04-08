import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Security headers for protected routes
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join('; ')
  },
];

// Headers for embeddable routes (allow iframe embedding)
const embedHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors *", // Allow embedding from any domain
      "form-action 'self'",
      "base-uri 'self'",
    ].join('; ')
  },
];

// Headers for public KYC routes (same origin framing only)
const publicKycHeaders = [
  ...securityHeaders.filter(h => h.key !== 'X-Frame-Options' && h.key !== 'Content-Security-Policy'),
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join('; ')
  },
];

// CORS headers for public API routes
const corsHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*'
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET, POST, PUT, DELETE, OPTIONS'
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'Content-Type, Authorization'
  },
];

const nextConfig: NextConfig = {
  // Set turbopack root to this project directory
  turbopack: {
    root: __dirname,
  },

  async headers() {
    return [
      // Public API routes - CORS enabled
      {
        source: '/api/public/:path*',
        headers: corsHeaders,
      },
      // Dashboard and auth routes - strict security
      {
        source: '/dashboard/:path*',
        headers: securityHeaders,
      },
      {
        source: '/login',
        headers: securityHeaders,
      },
      {
        source: '/signup',
        headers: securityHeaders,
      },
      {
        source: '/api/:path((?!public).*)',
        headers: securityHeaders,
      },
      // Embed routes - allow iframe embedding from anywhere (MUST come last to override)
      {
        source: '/embed/:path*',
        headers: embedHeaders,
      },
      // Public KYC routes (token-based) - allow same-origin framing
      {
        source: '/kyc/:token((?!individual|business).)*',
        headers: publicKycHeaders,
      },
      {
        source: '/kyc/:token/:path*',
        headers: publicKycHeaders,
      },
    ];
  },

  // Recommended for production
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
