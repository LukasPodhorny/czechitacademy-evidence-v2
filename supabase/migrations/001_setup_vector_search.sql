-- ============================================================
-- SQL Migration: Setup Vector Search for Evidence Inventory
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable pgvector extension
-- This extension provides vector data types and similarity search operators
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to the Evidence table
-- Using vector(768) - truncated from Gemini's 3072 dimensions
-- Supabase pgvector has 2000 dimension limit for indexes
ALTER TABLE "Evidence"
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Create HNSW index for efficient vector similarity search
-- HNSW is the recommended index type for pgvector
CREATE INDEX IF NOT EXISTS idx_evidence_embedding_hnsw
ON "Evidence"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Create the match_evidence RPC function
-- This function performs semantic search using cosine similarity
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
        -- Calculate cosine similarity (1 - distance, so higher is better)
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM "Evidence" e
    WHERE e.embedding IS NOT NULL
        -- Filter by similarity threshold (e.g., 0.5 means 50% similar)
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5. Add comment to document the function
COMMENT ON FUNCTION match_evidence IS 
'Performs semantic search on Evidence using vector similarity.
Parameters:
  - query_embedding: 768-dimensional vector (truncated from Gemini 3072)
  - match_threshold: Minimum similarity score (0-1), e.g., 0.5 for 50%
  - match_count: Maximum number of results to return
Returns: Evidence items sorted by relevance with similarity scores.';
