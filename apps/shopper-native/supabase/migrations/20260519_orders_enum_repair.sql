-- ============================================================================
-- Repair: ensure `order_status` enum contains all values the app uses.
--
-- Symptom this fixes:
--   ERROR: 22P02: invalid input value for enum order_status: "processing"
--
-- Root cause: an earlier `order_status` enum exists in the DB (from a
-- Supabase template, an earlier partial migration, or a different schema)
-- and is missing one or more of: pending, processing, shipped, delivered,
-- cancelled. The orders schema's cancel policy validates these literals
-- against the existing enum and fails.
--
-- This file runs at the top level (NOT wrapped in a single DO block) so
-- each ALTER TYPE statement is its own transaction. `ADD VALUE IF NOT
-- EXISTS` is supported in PG 12+; Supabase is PG 15+. Each statement is
-- additionally guarded with EXCEPTION-WHEN-UNDEFINED-OBJECT so the file
-- is safe to run even if the enum doesn't exist yet (the orders schema
-- migration will create it).
--
-- Run order:
--   1. Apply this file (`20260519_orders_enum_repair.sql`)
--   2. Then re-apply `20260519_orders_schema.sql` (idempotent)
-- ============================================================================

do $$
begin
  alter type order_status add value if not exists 'pending';
exception
  when undefined_object then null;  -- enum doesn't exist yet; schema migration will create it
end $$;

do $$
begin
  alter type order_status add value if not exists 'processing';
exception
  when undefined_object then null;
end $$;

do $$
begin
  alter type order_status add value if not exists 'shipped';
exception
  when undefined_object then null;
end $$;

do $$
begin
  alter type order_status add value if not exists 'delivered';
exception
  when undefined_object then null;
end $$;

do $$
begin
  alter type order_status add value if not exists 'cancelled';
exception
  when undefined_object then null;
end $$;
