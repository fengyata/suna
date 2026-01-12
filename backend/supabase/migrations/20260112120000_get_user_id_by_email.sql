BEGIN;

-- SECURITY DEFINER RPC to fetch auth user id by email.
-- This is used server-side to avoid scanning Auth Admin list_users.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_param TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    IF email_param IS NULL OR LENGTH(TRIM(email_param)) = 0 THEN
        RETURN NULL;
    END IF;

    RETURN (
        SELECT u.id
        FROM auth.users u
        WHERE LOWER(u.email) = LOWER(email_param)
        LIMIT 1
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role, authenticated;

COMMENT ON FUNCTION public.get_user_id_by_email(TEXT)
IS 'Returns the Supabase Auth user id (auth.users.id) for a given email address (case-insensitive).';

COMMIT;
