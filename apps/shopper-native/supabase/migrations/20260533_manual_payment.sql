-- Step 1 of 2: add enum value only.
-- Must be committed before 20260535_manual_payment_apply.sql (Postgres 55P04).

alter type order_status add value if not exists 'pending_payment';
