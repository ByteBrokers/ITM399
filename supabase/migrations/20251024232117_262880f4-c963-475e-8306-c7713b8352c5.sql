-- Add facial expression and shirt pattern columns to character_customization table
ALTER TABLE character_customization 
ADD COLUMN IF NOT EXISTS facial_expression TEXT DEFAULT 'happy',
ADD COLUMN IF NOT EXISTS shirt_pattern TEXT DEFAULT 'solid';