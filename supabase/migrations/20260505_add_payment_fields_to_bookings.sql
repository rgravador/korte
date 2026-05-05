-- Add payment_mode and paid_amount to bookings table
-- Existing rows default to 'full' payment with paid_amount = total

ALTER TABLE bookings
  ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'full'
    CHECK (payment_mode IN ('full', 'downpayment')),
  ADD COLUMN paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Backfill existing bookings: assume full payment was collected
UPDATE bookings SET paid_amount = total WHERE paid_amount = 0;
