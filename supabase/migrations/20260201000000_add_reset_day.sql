-- Add reset_day column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reset_day SMALLINT DEFAULT 1;

-- Add checking constraint to ensure valid days (1-31) or -1 for last day
ALTER TABLE public.profiles
ADD CONSTRAINT reset_day_check CHECK (reset_day >= -1 AND reset_day <= 31 AND reset_day != 0);
