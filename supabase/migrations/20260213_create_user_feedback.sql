-- Create User Feedback Table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('Bug', 'Feature Request', 'UI/UX Improvement', 'Other')),
    message TEXT NOT NULL,
    screenshot_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved', 'ignored')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional metadata
    app_version TEXT,
    device_info TEXT
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own feedback" 
ON public.user_feedback FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" 
ON public.user_feedback FOR SELECT 
USING (auth.uid() = user_id);

-- Storage Bucket for Feedback Attachments
-- Note: Creating buckets via SQL is not always supported directly in all Supabase environments/extensions.
-- If this fails, the user must create it manually.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback_attachments', 'feedback_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow authenticated users to upload
CREATE POLICY "feedback_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback_attachments' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view
CREATE POLICY "feedback_view"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'feedback_attachments');
