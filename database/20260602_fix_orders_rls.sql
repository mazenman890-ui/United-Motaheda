-- =============================================================================
-- Migration: Fix orders RLS + order_items table + FK for nested selects
-- Date: 2026-06-02
--
-- Problems fixed:
--   1. "function public.resolve_permissions(uuid) does not exist" (code 42883)
--      A stale RLS policy on orders called a helper that was never created.
--      Every SELECT on orders was failing at policy-evaluation time.
--
--   2. 404 on orders?select=...order_items(...) nested select
--      PostgREST needs a FK order_items.order_id → orders.id to resolve
--      embedded resource syntax.  Added the FK + correct RLS.
--
-- All statements are idempotent — safe to re-run.
-- =============================================================================

-- ─── Step 1: Drop ALL existing policies on orders (nuclear, then rebuild) ───
-- We don't know what names the broken policies have, so drop all of them.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', r.policyname);
  END LOOP;
END;
$$;

-- ─── Step 2: Enable RLS on orders (no-op if already on) ─────────────────────

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ─── Step 3: Correct policies for orders ────────────────────────────────────

-- Authenticated users can read their own orders
CREATE POLICY orders_select_own
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

-- Admins / managers can read all orders
CREATE POLICY orders_select_admin
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- ─── Step 4: Ensure order_items table exists with correct FK ─────────────────
-- If it already exists this is a no-op.
-- The FK is what PostgREST uses to resolve order_items(...) embedded select.

CREATE TABLE IF NOT EXISTS public.order_items (
  id               bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id         uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id       text,
  quantity         integer     NOT NULL DEFAULT 1,
  unit_price       numeric(12, 2) NOT NULL DEFAULT 0,
  line_total       numeric(12, 2) NOT NULL DEFAULT 0,
  product_snapshot jsonb       NOT NULL DEFAULT '{}'::jsonb
);

-- Add the FK if the table existed before without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name   = 'order_items'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'order_id'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Index for fast lookup by order
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);

-- ─── Step 5: RLS on order_items ──────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', r.policyname);
  END LOOP;
END;
$$;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Users can read items that belong to their own orders
CREATE POLICY order_items_select_own
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

-- Admins / managers can read all order items
CREATE POLICY order_items_select_admin
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- ─── Done ─────────────────────────────────────────────────────────────────────
