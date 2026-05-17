-- ============================================================================
-- Notification infrastructure migration
-- ----------------------------------------------------------------------------
-- ADDITIVE ONLY — every statement uses IF NOT EXISTS / CREATE OR REPLACE so
-- this is safe to re-run. No DROPs, no destructive operations.
--
-- Run in Supabase SQL Editor. Verify each block one by one if needed.
-- ============================================================================

-- ─── 1. notifications table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT         NOT NULL,
  category    TEXT,
  title       TEXT         NOT NULL,
  body        TEXT         NOT NULL,
  data        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  action_url  TEXT,
  is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Back-fill `is_read` column if the table predates this migration with `read`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications' AND column_name='read'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications' AND column_name='is_read'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN "read" TO is_read;
  END IF;
END$$;

-- Optional category column for grouping (orders, promotions, security, etc.)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Type check constraint — keep loose so future types can be added without migrations
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- ─── 2. Indexes ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications (user_id);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id) WHERE is_read = FALSE;

-- ─── 3. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- service-role / admin inserts unrestricted via service key
DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;
CREATE POLICY notifications_insert_admin ON public.notifications
  FOR INSERT WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR (auth.jwt()->'user_metadata'->>'role') IN ('admin','manager')
  );

-- ─── 4. Realtime publication ────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END$$;

-- ─── 5. notification_tokens table (Expo push tokens) ────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_tokens (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT         NOT NULL,
  platform        TEXT         NOT NULL CHECK (platform IN ('ios','android','web')),
  device_id       TEXT,
  app_version     TEXT,
  last_seen_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS notification_tokens_user_idx
  ON public.notification_tokens (user_id);

ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_tokens_select_own ON public.notification_tokens;
CREATE POLICY notification_tokens_select_own ON public.notification_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notification_tokens_insert_own ON public.notification_tokens;
CREATE POLICY notification_tokens_insert_own ON public.notification_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notification_tokens_update_own ON public.notification_tokens;
CREATE POLICY notification_tokens_update_own ON public.notification_tokens
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notification_tokens_delete_own ON public.notification_tokens;
CREATE POLICY notification_tokens_delete_own ON public.notification_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ─── 6. Notification preferences (additive columns on profiles) ─────────────
--
-- Stored as a single JSONB column so future preference keys don't need new
-- migrations. Default: all categories enabled, push/email on, sms off.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT jsonb_build_object(
    'channels', jsonb_build_object(
      'push',  TRUE,
      'email', TRUE,
      'sms',   FALSE
    ),
    'categories', jsonb_build_object(
      'order_updates',    TRUE,
      'promotions',       TRUE,
      'security_alerts',  TRUE,
      'health_reminders', TRUE,
      'new_arrivals',     TRUE,
      'account_updates',  TRUE
    )
  );

-- ─── 7. Helper: broadcast notification to all users ─────────────────────────

CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_type     TEXT,
  p_category TEXT,
  p_title    TEXT,
  p_body     TEXT,
  p_data     JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  -- Caller must be admin/manager
  IF NOT (auth.jwt()->'user_metadata'->>'role' IN ('admin','manager')) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  INSERT INTO public.notifications (user_id, type, category, title, body, data)
  SELECT id, p_type, p_category, p_title, p_body, p_data FROM auth.users;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.broadcast_notification TO authenticated;

-- ─── 8. Helper: unread count ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notification_unread_count(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.notifications
  WHERE user_id = p_user_id AND is_read = FALSE;
$$;

GRANT EXECUTE ON FUNCTION public.notification_unread_count TO authenticated;
