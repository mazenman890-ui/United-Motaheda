-- =============================================================================
-- Migration: Fix loyalty points timing + orders table improvements
-- Date: 2026-05-26
-- =============================================================================
-- PROBLEM:
--   Points were awarded immediately on order creation (wrong).
--   Points must only be awarded after:
--     1. payment_status transitions to 'verified'
--     2. order status is not 'cancelled'
--
-- SOLUTION:
--   1. Drop any existing trigger that awards points on INSERT to orders
--   2. Create a trigger that fires on UPDATE to orders.payment_status
--      and awards points only when payment_status = 'verified'
--   3. Add idempotency guard: track awarded points per order_id
--   4. Add DB index for orders(payment_status) and orders(status, user_id)
--
-- This migration is safe to run multiple times (all statements use IF NOT EXISTS
-- or CREATE OR REPLACE).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: Loyalty points ledger table (if not exists)
-- Awards are tracked here so we never double-award.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.loyalty_point_awards (
  id          bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    uuid         NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id     uuid         NOT NULL,
  points      integer      NOT NULL CHECK (points > 0),
  awarded_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(order_id)   -- one award per order, ever
);

CREATE INDEX IF NOT EXISTS loyalty_point_awards_user_idx
  ON public.loyalty_point_awards (user_id, awarded_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: Points-per-EGP rate config (single-row config table)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.loyalty_config (
  id               integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton
  points_per_egp   numeric(6,2) NOT NULL DEFAULT 1.0,
  min_order_egp    numeric(10,2) NOT NULL DEFAULT 0.0,
  updated_at       timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO public.loyalty_config (id, points_per_egp, min_order_egp)
VALUES (1, 1.0, 0.0)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: Drop legacy triggers that awarded points on order creation
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop any trigger whose name hints at points-on-insert patterns.
-- Safe to call even if they don't exist (DO block catches the exception).
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table IN ('orders', 'order_items')
      AND (
        trigger_name ILIKE '%point%'
        OR trigger_name ILIKE '%loyalty%'
        OR trigger_name ILIKE '%reward%'
      )
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      rec.trigger_name,
      rec.event_object_table
    );
    RAISE NOTICE 'Dropped trigger: %.%', rec.event_object_table, rec.trigger_name;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: Award-points function
-- Called by the trigger below. Guards against:
--   - double award (unique constraint on loyalty_point_awards.order_id)
--   - cancelled orders
--   - orders without a user
--   - below minimum spend
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_award_loyalty_points_on_payment_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config       public.loyalty_config%ROWTYPE;
  v_points       integer;
  v_already_awarded boolean;
BEGIN
  -- Only fire when payment_status transitions TO 'verified'
  IF NEW.payment_status IS DISTINCT FROM 'verified'         THEN RETURN NEW; END IF;
  IF OLD.payment_status = 'verified'                        THEN RETURN NEW; END IF;
  -- Cancelled orders never earn points
  IF NEW.status = 'cancelled'                               THEN RETURN NEW; END IF;
  -- Must have a user
  IF NEW.user_id IS NULL                                    THEN RETURN NEW; END IF;

  -- Idempotency check (race condition / retry guard)
  SELECT EXISTS(
    SELECT 1 FROM public.loyalty_point_awards WHERE order_id = NEW.id
  ) INTO v_already_awarded;

  IF v_already_awarded THEN
    RAISE NOTICE 'fn_award_loyalty_points: order % already awarded, skipping', NEW.id;
    RETURN NEW;
  END IF;

  -- Load config
  SELECT * INTO v_config FROM public.loyalty_config WHERE id = 1;

  -- Minimum spend gate
  IF NEW.total < v_config.min_order_egp THEN
    RAISE NOTICE 'fn_award_loyalty_points: order % below min spend (%.2f < %.2f)',
      NEW.id, NEW.total, v_config.min_order_egp;
    RETURN NEW;
  END IF;

  -- Calculate points: floor(total * rate)
  v_points := floor(NEW.total::numeric * v_config.points_per_egp)::integer;

  IF v_points <= 0 THEN RETURN NEW; END IF;

  -- Record the award (unique constraint prevents double-award)
  BEGIN
    INSERT INTO public.loyalty_point_awards (order_id, user_id, points)
    VALUES (NEW.id, NEW.user_id, v_points);
  EXCEPTION WHEN unique_violation THEN
    -- Another concurrent call already awarded — silently skip
    RAISE NOTICE 'fn_award_loyalty_points: unique_violation for order %, skipping', NEW.id;
    RETURN NEW;
  END;

  -- Credit the user's loyalty wallet.
  -- Assumes a loyalty_wallets table with (user_id PK, balance integer).
  -- Insert-or-update: upsert to handle first-time wallet creation.
  INSERT INTO public.loyalty_wallets (user_id, balance)
  VALUES (NEW.user_id, v_points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance    = public.loyalty_wallets.balance + EXCLUDED.balance,
    updated_at = now();

  -- Write to the ledger for history / statement view.
  INSERT INTO public.loyalty_ledger (
    user_id, order_id, points, direction, reason, created_at
  ) VALUES (
    NEW.user_id,
    NEW.id,
    v_points,
    'credit',
    'order_payment_verified',
    now()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'fn_award_loyalty_points: awarded % points to user % for order %',
    v_points, NEW.user_id, NEW.id;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: Attach the trigger to orders.payment_status UPDATE
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_award_loyalty_on_payment_verified ON public.orders;

CREATE TRIGGER trg_award_loyalty_on_payment_verified
  AFTER UPDATE OF payment_status
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_award_loyalty_points_on_payment_verified();

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: Ensure loyalty_wallets and loyalty_ledger tables exist
-- (These may already exist; CREATE TABLE IF NOT EXISTS is safe)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.loyalty_wallets (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    integer     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id   uuid        REFERENCES public.orders(id) ON DELETE SET NULL,
  points     integer     NOT NULL,
  direction  text        NOT NULL CHECK (direction IN ('credit', 'debit')),
  reason     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (order_id, direction)  -- one ledger entry per order per direction
);

CREATE INDEX IF NOT EXISTS loyalty_ledger_user_idx
  ON public.loyalty_ledger (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: Performance indexes for the orders table
-- ─────────────────────────────────────────────────────────────────────────────

-- Status queries (admin panel filter by status)
CREATE INDEX IF NOT EXISTS orders_status_created_idx
  ON public.orders (status, created_at DESC);

-- Payment status queries (admin verification queue)
CREATE INDEX IF NOT EXISTS orders_payment_status_idx
  ON public.orders (payment_status, created_at DESC)
  WHERE payment_status = 'pending_verification';

-- User + created (already exists per Prisma schema, but guard it)
CREATE INDEX IF NOT EXISTS orders_user_created_idx
  ON public.orders (user_id, created_at DESC);

-- order_items → orders join (already has index, guard)
CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON public.order_items (order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: RLS policies for loyalty tables
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.loyalty_wallets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_ledger     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_point_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_config     ENABLE ROW LEVEL SECURITY;

-- Users can only see their own wallet
DROP POLICY IF EXISTS loyalty_wallets_self ON public.loyalty_wallets;
CREATE POLICY loyalty_wallets_self
  ON public.loyalty_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see their own ledger
DROP POLICY IF EXISTS loyalty_ledger_self ON public.loyalty_ledger;
CREATE POLICY loyalty_ledger_self
  ON public.loyalty_ledger
  FOR SELECT
  USING (auth.uid() = user_id);

-- No client mutations on wallets or ledger (only trigger / service role)
DROP POLICY IF EXISTS loyalty_wallets_no_client_write ON public.loyalty_wallets;
CREATE POLICY loyalty_wallets_no_client_write
  ON public.loyalty_wallets
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Allow admins to read everything
DROP POLICY IF EXISTS loyalty_wallets_admin ON public.loyalty_wallets;
CREATE POLICY loyalty_wallets_admin
  ON public.loyalty_wallets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Config is readable by all authenticated users (needed for UI)
DROP POLICY IF EXISTS loyalty_config_read ON public.loyalty_config;
CREATE POLICY loyalty_config_read
  ON public.loyalty_config
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: Back-fill any existing 'verified' orders that missed points
--            (run once, safe to re-run — unique constraint prevents doubles)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_config  public.loyalty_config%ROWTYPE;
  v_points  integer;
  rec       record;
BEGIN
  SELECT * INTO v_config FROM public.loyalty_config WHERE id = 1;

  FOR rec IN
    SELECT o.id, o.user_id, o.total
    FROM   public.orders o
    LEFT  JOIN public.loyalty_point_awards lpa ON lpa.order_id = o.id
    WHERE  o.payment_status = 'verified'
      AND  o.status         <> 'cancelled'
      AND  o.user_id        IS NOT NULL
      AND  lpa.order_id     IS NULL   -- not yet awarded
      AND  o.total          >= v_config.min_order_egp
  LOOP
    v_points := floor(rec.total::numeric * v_config.points_per_egp)::integer;
    IF v_points > 0 THEN
      BEGIN
        INSERT INTO public.loyalty_point_awards (order_id, user_id, points)
        VALUES (rec.id, rec.user_id, v_points);

        INSERT INTO public.loyalty_wallets (user_id, balance)
        VALUES (rec.user_id, v_points)
        ON CONFLICT (user_id)
        DO UPDATE SET balance = public.loyalty_wallets.balance + EXCLUDED.balance,
                      updated_at = now();

        INSERT INTO public.loyalty_ledger (user_id, order_id, points, direction, reason)
        VALUES (rec.user_id, rec.id, v_points, 'credit', 'order_payment_verified_backfill')
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Back-fill: awarded % pts to user % for order %', v_points, rec.user_id, rec.id;
      EXCEPTION WHEN unique_violation THEN
        NULL; -- Already awarded in a parallel run, skip
      END;
    END IF;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.fn_award_loyalty_points_on_payment_verified()
  IS 'Awards loyalty points when an order payment_status transitions to verified. Idempotent via loyalty_point_awards unique constraint.';
