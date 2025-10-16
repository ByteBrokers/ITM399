-- Add earnings_history table to track money earned over time
CREATE TABLE IF NOT EXISTS public.earnings_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  data_type TEXT NOT NULL,
  company_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.earnings_history ENABLE ROW LEVEL SECURITY;

-- Create policies for earnings_history
CREATE POLICY "Users can view their own earnings history"
ON public.earnings_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own earnings"
ON public.earnings_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_earnings_user_date ON public.earnings_history(user_id, created_at DESC);