-- Add order fulfillment tracking and internal staff note fields to don_hang.
ALTER TABLE antam.don_hang
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS internal_note TEXT NOT NULL DEFAULT '';
