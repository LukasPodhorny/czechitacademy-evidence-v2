# Vector Search Migration Guide

This guide walks you through migrating from the Groq-based AI search to Supabase pgvector semantic search.

## Overview

The new system uses:
- **Google Gemini API** (`gemini-embedding-001`) for generating 3072-dimensional embeddings
- **Supabase pgvector** extension for storing and searching vectors in your `Evidence` table
- **Cosine similarity** for semantic matching

## Required npm Packages

Install these dependencies:

```bash
# Core dependencies for API and scripts
npm install @google/generative-ai @supabase/supabase-js

# For the embedding generation script (if not already installed)
npm install -D tsx dotenv

# For Vercel serverless types (optional, for TypeScript)
npm install -D @vercel/node
```

## Environment Variables

Add these to your `.env.local` file:

```env
# Google Gemini API (for embeddings)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (you may already have these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Note**: The `SUPABASE_SERVICE_ROLE_KEY` has admin privileges - never expose it to the frontend!

## Step 1: Database Setup

**IMPORTANT**: Run this SQL in Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (3072 dimensions for gemini-embedding-001)
ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS embedding vector(3072);

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_evidence_embedding_hnsw
ON "Evidence" USING hnsw (embedding vector_cosine_ops);

-- Create the match_evidence RPC function
CREATE OR REPLACE FUNCTION match_evidence(
    query_embedding vector(3072),
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
```

## Step 2: Generate Embeddings

After database setup, generate embeddings for all existing items:

```bash
# Run the embedding generation script
npx tsx scripts/generate-embeddings.ts
```

This script will:
1. Fetch all items without embeddings from your `Evidence` table in Supabase
2. Generate 3072-dimensional vectors using Gemini API
3. Update each item with its embedding
4. Show progress and estimated time

**Rate Limiting**: The script includes 100ms delays between requests to stay within Gemini's free tier limits (1500 requests/minute).

## Step 3: Deploy API Route

The new API endpoint is at `api/vector-search.ts`. For Vercel deployment:

1. Ensure the file is in your `api/` directory
2. Add environment variables to Vercel Dashboard:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy as usual

## Step 4: Update Frontend

Replace the old `useAiSearch` hook with the new `useVectorSearch`:

### Old (Groq-based):
```tsx
import { useAiSearch } from './hooks/useAiSearch';

function SearchComponent() {
    const { aiResults, aiLoading, aiError, rateLimited, search } = useAiSearch();
    // aiResults is number[] (indices)
}
```

### New (Vector-based):
```tsx
import { useVectorSearch } from './hooks/useVectorSearch';

function SearchComponent() {
    const { results, loading, error, search } = useVectorSearch();
    // results is Item[] (full items sorted by relevance)

    // Optional: access similarity scores
    const { rawResults } = useVectorSearch();
    // rawResults includes similarity scores
}
```

## API Usage

### Request
```http
POST /api/vector-search
Content-Type: application/json

{
    "query": "stabilizátor napětí",
    "match_threshold": 0.5,  // Optional: 0-1, default 0.5
    "match_count": 20        // Optional: 1-100, default 20
}
```

### Response
```json
{
    "results": [
        {
            "id": 123,
            "ID / SKU": "REG-001",
            "Název": "Stabilizátor napětí 5V",
            "Kategorie": "Napájecí zdroje",
            "Umístění": "Sklad A",
            "Množství": "50",
            "Jednotka": "ks",
            "Poznámka": "L7805CV",
            "similarity": 0.89
        }
    ],
    "count": 1,
    "query": "stabilizátor napětí",
    "threshold": 0.5
}
```

## Performance Comparison

| Aspect | Old (Groq) | New (Vector) |
|--------|-----------|--------------|
| Latency | 2-5s | 50-200ms |
| Rate Limits | 20 req/min | 1500 req/min |
| Token Limits | 128k tokens | Unlimited |
| Database Load | High (full fetch) | Low (indexed search) |
| Cost | Groq API calls | Gemini (free tier: 1500 req/min) |

## Troubleshooting

### "Extension vector is not available"
- Ensure you're on Supabase Pro plan (pgvector requires it)
- Run the SQL migration in the correct database

### "match_evidence function not found"
- Verify the SQL migration ran successfully
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'match_evidence';`

### "Expected 3072 dimensions, got X"
- The gemini-embedding-001 model returns 3072 dimensions
- Ensure your Supabase column is `vector(3072)` not `vector(768)`

### No results returned
- Verify embeddings were generated: `SELECT COUNT(*) FROM "Evidence" WHERE embedding IS NOT NULL;`
- Try lowering `match_threshold` (e.g., 0.3)
- Check query is in Czech (embeddings are language-agnostic but training data matters)

### Rate limit errors from Gemini
- The script has built-in delays, but you can increase them
- Consider batching: process fewer items per run
- Upgrade to paid Gemini tier for higher limits

## Migration Checklist

- [ ] Install npm packages
- [ ] Add environment variables
- [ ] Run SQL migration in Supabase
- [ ] Generate embeddings for existing data
- [ ] Deploy new API route
- [ ] Update frontend to use `useVectorSearch`
- [ ] Test search functionality
- [ ] Remove old Groq-based code (optional cleanup)
- [ ] Update documentation

## Cleanup (After Migration)

Once verified working, you can remove:
- `api/ai-search.js` (old Groq endpoint)
- `src/hooks/useAiSearch.ts` (old hook)
- `GROQ_API_KEY` environment variable
- Rate limit banner components (no longer needed)

## Support

For issues:
1. Check Supabase logs in Dashboard → Logs
2. Verify Gemini API key at https://aistudio.google.com/app/apikey
3. Test RPC function directly in SQL Editor:
   ```sql
   SELECT * FROM match_parts(
       ARRAY(SELECT random() FROM generate_series(1, 768))::vector,
       0.5,
       10
   );
   ```
