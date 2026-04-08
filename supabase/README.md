# Supabase Migrations

This directory contains the database migrations for the KYC application with enhanced security features.

## Migration Files

- `00001_initial_schema.sql` - Initial database schema with tables, enums, indexes, triggers, and security-enhanced RLS policies

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for initial setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `00001_initial_schema.sql`
4. Paste and run the SQL

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### Option 3: Direct Database Connection

```bash
# Using psql
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -f migrations/00001_initial_schema.sql
```

## Schema Overview

### Security Tables

| Table | Description |
|-------|-------------|
| `user_profiles` | Extended user profile with security settings (MFA, lockout, etc.) |
| `security_audit_log` | Immutable audit log for security events |
| `user_sessions` | Active session tracking for security monitoring |
| `rate_limits` | Rate limiting tracking (service role only) |

### Application Tables

| Table | Description |
|-------|-------------|
| `customers` | Main table for individual and business customers |
| `addresses` | Customer addresses (primary, mailing, etc.) |
| `identifications` | ID documents (passport, driver's license, etc.) |
| `documents` | Encrypted document storage (base64 + AES-256) |
| `associated_persons` | Beneficial owners, control persons, signers |
| `kyc_submissions` | KYC submission audit log |
| `kyc_reviews` | Review decisions by administrators |
| `encryption_keys` | Key rotation tracking (service role only) |

## Security Best Practices Implemented

### 1. Email Verification Requirement

Write operations (INSERT, UPDATE, DELETE) on sensitive tables require:
- Verified email (`is_email_verified()`)
- Active account status (`is_account_active()`)

```sql
-- Example: Only verified users can create customers
CREATE POLICY "customers_insert_own" ON customers
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND can_perform_sensitive_operations()
    );
```

### 2. Account Lockout Protection

- Failed login attempts are tracked in `user_profiles.failed_login_attempts`
- After 5 failed attempts, account is locked for 30 minutes
- Automatic unlock after lockout period expires

```sql
-- Functions available:
SELECT increment_failed_login(user_id);  -- On failed login
SELECT reset_failed_login(user_id);      -- On successful login
```

### 3. Session Management

- Track active sessions per user
- Limit maximum concurrent sessions (default: 5)
- Force logout capability via `force_logout_before` timestamp
- Session revocation by users

### 4. Immutable Audit Logging

- All security events are logged to `security_audit_log`
- Users can only SELECT their own audit entries
- No UPDATE/DELETE allowed (immutable)

### 5. Prevent Ownership Tampering

```sql
-- Trigger prevents user_id modification after creation
CREATE TRIGGER prevent_customers_user_id_change
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();
```

### 6. Draft-Only Deletion

Users can only delete records in `draft` status:
```sql
CREATE POLICY "customers_delete_own" ON customers
    FOR DELETE TO authenticated
    USING (
        auth.uid() = user_id
        AND can_perform_sensitive_operations()
        AND status = 'draft'
    );
```

## RLS Policy Matrix

### Security Tables

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `user_profiles` | Own | Trigger | Own (limited) | - |
| `security_audit_log` | Own | Service | - | - |
| `user_sessions` | Own | Service | Own (revoke only) | Service |
| `rate_limits` | - | - | - | - |

### Application Tables (Require Email Verification for Write)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `customers` | Own + Active | Verified | Verified | Verified + Draft |
| `addresses` | Via customer | Verified | Verified | Verified + Draft |
| `identifications` | Via customer | Verified | Verified | Verified + Draft |
| `documents` | Via customer | Verified | Verified | Verified + Draft |
| `associated_persons` | Via customer | Verified | Verified | Verified + Draft |
| `kyc_submissions` | Via customer | Verified | - | - |
| `kyc_reviews` | Via submission | Service | Service | Service |
| `encryption_keys` | - | - | - | - |

**Legend:**
- **Own**: User can access their own records
- **Via customer**: Access through parent customer ownership check
- **Verified**: Requires `can_perform_sensitive_operations()` (email verified + active account)
- **Draft**: Only when customer status is 'draft'
- **Service**: Service role only
- **-**: No access

## Security Helper Functions

| Function | Description |
|----------|-------------|
| `is_email_verified()` | Checks if current user's email is verified |
| `is_account_active()` | Checks if account is active and not locked |
| `can_perform_sensitive_operations()` | Combined check (verified + active) |
| `user_owns_customer(uuid)` | Checks if user owns a specific customer |
| `get_user_customer_ids()` | Returns all customer IDs for current user |
| `increment_failed_login(uuid)` | Increment failed attempts (call on failed login) |
| `reset_failed_login(uuid)` | Reset failed attempts (call on successful login) |
| `cleanup_expired_sessions()` | Remove old sessions (scheduled job) |
| `cleanup_rate_limits()` | Remove old rate limit entries (scheduled job) |

## Auto-Created User Profile

A trigger automatically creates a `user_profiles` entry when a new user signs up:

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();
```

Initial status is `pending_verification`.

## Environment Variables

Make sure your `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Post-Migration Steps

### 1. Enable Email Verification in Supabase

1. Go to Authentication > Settings
2. Enable "Confirm email" option
3. Customize email templates as needed

### 2. Set Up Scheduled Jobs (Optional)

If using `pg_cron` extension:

```sql
-- Enable pg_cron (in Supabase Dashboard > Database > Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule session cleanup (daily at 3 AM)
SELECT cron.schedule('cleanup-expired-sessions', '0 3 * * *', 'SELECT cleanup_expired_sessions()');

-- Schedule rate limit cleanup (hourly)
SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_rate_limits()');
```

### 3. Activate User Accounts

After email verification, update user status to 'active':

```sql
-- Call from your application after email verification
UPDATE user_profiles
SET account_status = 'active', email_verified_at = NOW()
WHERE id = 'user-uuid-here';
```

## Notes

- All sensitive data (SSN, EIN, ID numbers, documents) is encrypted at the application level before storage
- The `content_encrypted` column in `documents` stores base64-encoded files encrypted with AES-256
- File size is limited to 10MB per document
- Rate limiting table is managed by service role only for security
- Encryption keys table has no RLS policies for regular users
