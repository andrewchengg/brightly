-- Fix Supabase Security Warnings
-- This file addresses the security warnings from Supabase linter

-- =============================================================================
-- Fix Function Search Path Mutable Issue
-- =============================================================================

-- Drop the function if it exists and recreate with secure search_path
DROP FUNCTION IF EXISTS public.check_rls_performance();

-- Create the function with immutable search_path for security
CREATE OR REPLACE FUNCTION public.check_rls_performance()
RETURNS TABLE (
    table_name text,
    policy_count bigint,
    avg_execution_time numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    rec record;
    start_time timestamp;
    end_time timestamp;
    execution_time numeric;
BEGIN
    -- Check RLS policies and their performance
    FOR rec IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
    LOOP
        start_time := clock_timestamp();
        
        -- Simple performance check query
        EXECUTE format('SELECT COUNT(*) FROM %I.%I LIMIT 1', rec.schemaname, rec.tablename);
        
        end_time := clock_timestamp();
        execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        RETURN QUERY
        SELECT 
            rec.tablename::text,
            (SELECT COUNT(*) FROM pg_policies WHERE schemaname = rec.schemaname AND tablename = rec.tablename),
            execution_time;
    END LOOP;
    
    RETURN;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_rls_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rls_performance() TO service_role;

-- =============================================================================
-- Enable Leaked Password Protection
-- =============================================================================

-- Note: This needs to be done through the Supabase dashboard or API
-- The SQL equivalent would be to update the auth configuration
-- For now, we'll add a comment with instructions

-- TO ENABLE LEAKED PASSWORD PROTECTION:
-- 1. Go to Authentication -> Settings in your Supabase dashboard
-- 2. Enable "Leaked Password Protection" under Password Requirements
-- 3. Or use the Management API to update auth settings programmatically

-- Alternative: Create a function to remind about this configuration
CREATE OR REPLACE FUNCTION public.auth_security_reminder()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN 'Remember to enable leaked password protection in Supabase Auth settings';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.auth_security_reminder() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_security_reminder() TO service_role;

-- =============================================================================
-- Additional Security Enhancements
-- =============================================================================

-- Create a function to check if RLS is enabled on all tables
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE (
    table_name text,
    rls_enabled boolean,
    rls_forced boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        t.rowsecurity,
        COALESCE(t.rowsecurity, false) AND EXISTS (
            SELECT 1 FROM pg_policies p 
            WHERE p.schemaname = t.schemaname 
            AND p.tablename = t.tablename
        )
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    ORDER BY t.tablename;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_rls_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rls_status() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION public.check_rls_performance() IS 'Checks RLS policy performance with secure search_path';
COMMENT ON FUNCTION public.auth_security_reminder() IS 'Reminder to enable leaked password protection in Supabase Auth';
COMMENT ON FUNCTION public.check_rls_status() IS 'Checks if RLS is properly enabled on all tables'; 