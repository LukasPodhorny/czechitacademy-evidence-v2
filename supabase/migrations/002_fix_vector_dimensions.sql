-- Fix: Update embedding column to 768 dimensions (truncated from Gemini 3072)
-- Run this in Supabase SQL Editor

-- First, drop the existing embedding column
ALTER TABLE "Evidence" DROP COLUMN IF EXISTS embedding;

-- Recreate with 768 dimensions (truncated from Gemini's 3072)
ALTER TABLE "Evidence" ADD COLUMN embedding vector(768);

-- Recreate the HNSW index
DROP INDEX IF EXISTS idx_evidence_embedding_hnsw;
DROP INDEX IF EXISTS idx_evidence_embedding_ivfflat;
CREATE INDEX idx_evidence_embedding_hnsw
ON "Evidence" USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Recreate the match_evidence function with 768 dimensions
CREATE OR REPLACE FUNCTION match_evidence(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id bigint,
    "ID / SKU" text,
    "Název" text,
    "Kategorie" text,
    "Umístění" text,
    "Množství" text,
    "Jednotka" text,
    "Poznámka" text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e."ID / SKU",
        e."Název",
        e."Kategorie",
        e."Umístění",
        e."Množství",
        e."Jednotka",
        e."Poznámka",
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM "Evidence" e
    WHERE e.embedding IS NOT NULL
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
