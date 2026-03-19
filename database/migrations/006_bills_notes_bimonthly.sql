-- Add notes and bimonthly date columns to bills table
ALTER TABLE bills
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS date1 INT,
ADD COLUMN IF NOT EXISTS date2 INT;
