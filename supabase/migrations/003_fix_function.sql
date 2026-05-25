-- Fix: Recreate match_evidence function with correct return type
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS match_evidence(vector(768), float, int);

-- Create a composite type for the return value
DROP TYPE IF EXISTS match_evidence_result;

CREATE TYPE match_evidence_result AS (
    id bigint,
    "ID / SKU" text,
    "Název" text,
    "Kategorie" text,
    "Umístění" text,
    "Množství" text,
    "Jednotka" text,
    "Poznámka" text,
    image_url text,
    similarity float
);

CREATE OR REPLACE FUNCTION match_evidence(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
RETURNS SETOF match_evidence_result
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id::bigint,
        e."ID / SKU"::text,
        e."Název"::text,
        e."Kategorie"::text,
        e."Umístění"::text,
        e."Množství"::text,
        e."Jednotka"::text,
        e."Poznámka"::text,
        e.image_url::text,
        (1 - (e.embedding <=> query_embedding))::float AS similarity
    FROM "Evidence" e
    WHERE e.embedding IS NOT NULL
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
