-- Add free-trial expiry support expected by the admin layout/dashboard.
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '14 days');

UPDATE restaurants
SET trial_ends_at = COALESCE(trial_ends_at, created_at + interval '14 days')
WHERE trial_ends_at IS NULL;
