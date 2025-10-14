-- Add DELETE policies for all user-facing tables
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questionnaire responses" 
ON public.questionnaire_responses 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own character customization" 
ON public.character_customization 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own game state" 
ON public.game_state 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;