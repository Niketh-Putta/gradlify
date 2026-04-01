CREATE TABLE english_passages (
    id TEXT PRIMARY KEY,
    track TEXT NOT NULL DEFAULT '11plus',
    "sectionId" TEXT NOT NULL,
    subtopic TEXT NOT NULL,
    difficulty INTEGER NOT NULL CHECK (difficulty IN (1, 2, 3)),
    tier TEXT NOT NULL,
    title TEXT NOT NULL,
    "desc" TEXT,
    "passageBlocks" JSONB NOT NULL,
    questions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optimized Performance Indexes
CREATE INDEX idx_english_passages_subtopic ON english_passages(subtopic);
CREATE INDEX idx_english_passages_difficulty ON english_passages(difficulty);
CREATE INDEX idx_english_passages_section ON english_passages("sectionId");

-- Optional: Enable RLS for security if you use authenticated reads
-- ALTER TABLE english_passages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read access" ON english_passages FOR SELECT USING (true);
