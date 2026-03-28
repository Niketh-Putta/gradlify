-- Add difficulty_level column to exam_questions table
ALTER TABLE exam_questions 
ADD COLUMN difficulty_level text DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'extreme'));