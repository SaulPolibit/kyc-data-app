import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/cron/cleanup-expired-data
// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
// to clean up expired session data based on DATA_STORED_EXPIRY_DAYS
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    // Option 1: Check for CRON_SECRET in Authorization header
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Option 2: For Vercel Cron, check the x-vercel-signature or bearer token
    if (cronSecret) {
      const providedSecret = authHeader?.replace('Bearer ', '');
      if (providedSecret !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      // If no CRON_SECRET is set, only allow from localhost in development
      const host = request.headers.get('host') || '';
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'CRON_SECRET environment variable is required in production' },
          { status: 500 }
        );
      }
      if (!host.includes('localhost')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Check if data retention is enabled
    const dataExpiryDays = parseInt(process.env.DATA_STORED_EXPIRY_DAYS || '0', 10);
    if (isNaN(dataExpiryDays) || dataExpiryDays <= 0) {
      return NextResponse.json({
        success: true,
        message: 'Data retention cleanup is disabled (DATA_STORED_EXPIRY_DAYS not set or 0)',
        sessions_cleaned: 0,
        customers_deleted: 0,
      });
    }

    // Call the cleanup function
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('cleanup_expired_session_data');

    if (error) {
      console.error('Cleanup error:', error);
      return NextResponse.json(
        { error: 'Failed to cleanup expired data', details: error.message },
        { status: 500 }
      );
    }

    const result = data?.[0] || { sessions_cleaned: 0, customers_deleted: 0 };

    console.log(`Data cleanup completed: ${result.sessions_cleaned} sessions cleaned, ${result.customers_deleted} customers deleted`);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      sessions_cleaned: result.sessions_cleaned,
      customers_deleted: result.customers_deleted,
      retention_days: dataExpiryDays,
    });
  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing/Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
