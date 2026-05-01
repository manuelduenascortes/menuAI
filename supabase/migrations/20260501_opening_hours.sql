-- Add opening_hours column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS opening_hours text;
