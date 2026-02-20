-- Ensure each physical device token is only associated with ONE user at a time
-- 1) Deduplicate existing tokens, keeping the latest row per token
DELETE FROM public.device_push_tokens a
USING public.device_push_tokens b
WHERE a.token = b.token
  AND a.id < b.id;

-- 2) Drop the old unique constraint on (user_id, token) if it exists
ALTER TABLE public.device_push_tokens
  DROP CONSTRAINT IF EXISTS device_push_tokens_user_id_token_key;

-- Drop the single-token constraint if it already exists so this migration is idempotent
ALTER TABLE public.device_push_tokens
  DROP CONSTRAINT IF EXISTS device_push_tokens_token_key;

-- 3) Add user_type to track whether the token belongs to a staff or student user
ALTER TABLE public.device_push_tokens
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'staff',
  ADD CONSTRAINT device_push_tokens_user_type_check
    CHECK (user_type IN ('staff', 'student'));

-- 4) Enforce uniqueness per token (a token belongs to only one user at a time)
ALTER TABLE public.device_push_tokens
  ADD CONSTRAINT device_push_tokens_token_key UNIQUE (token);

-- 5) Update the upsert function so a token is always re-attached to the latest user & type
CREATE OR REPLACE FUNCTION public.upsert_device_token(
    p_user_id BIGINT,
    p_school_id BIGINT,
    p_platform TEXT,
    p_token TEXT,
    p_user_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.device_push_tokens (user_id, school_id, platform, token, user_type, last_seen_at)
    VALUES (p_user_id, p_school_id, p_platform, p_token, p_user_type, NOW())
    ON CONFLICT (token)
    DO UPDATE SET
        user_id      = EXCLUDED.user_id,
        school_id    = EXCLUDED.school_id,
        platform     = EXCLUDED.platform,
        user_type    = EXCLUDED.user_type,
        last_seen_at = NOW();
END;
$$;
