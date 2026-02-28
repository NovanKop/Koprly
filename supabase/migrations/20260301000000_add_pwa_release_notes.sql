ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_pwa_release_notes BOOLEAN DEFAULT false;
