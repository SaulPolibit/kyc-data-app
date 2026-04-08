-- Fix migration: Add missing columns to customers table
-- This safely adds columns that may be missing

-- Add customer_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'customer_type'
    ) THEN
        -- First ensure the type exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
            CREATE TYPE customer_type AS ENUM ('individual', 'business');
        END IF;

        ALTER TABLE customers ADD COLUMN customer_type customer_type NOT NULL DEFAULT 'individual';
    END IF;
END $$;

-- Add other potentially missing columns
DO $$
BEGIN
    -- first_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE customers ADD COLUMN first_name TEXT;
    END IF;

    -- last_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE customers ADD COLUMN last_name TEXT;
    END IF;

    -- business_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'business_name'
    ) THEN
        ALTER TABLE customers ADD COLUMN business_name TEXT;
    END IF;

    -- email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'email'
    ) THEN
        ALTER TABLE customers ADD COLUMN email TEXT;
    END IF;

    -- status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'status'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
            CREATE TYPE customer_status AS ENUM (
                'draft', 'pending_review', 'approved', 'rejected', 'needs_more_info'
            );
        END IF;
        ALTER TABLE customers ADD COLUMN status customer_status NOT NULL DEFAULT 'draft';
    END IF;

    -- user_id (if missing, though this should exist)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE customers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE customers ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE customers ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Create index on customer_type if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
