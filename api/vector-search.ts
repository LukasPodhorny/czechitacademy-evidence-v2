/**
 * Vector Search API Route
 *
 * Serverless function for AI-powered semantic search using Supabase pgvector.
 * Replaces the old Groq-based approach with efficient vector similarity search.
 *
 * Endpoint: POST /api/vector-search
 * Body: { query: string, match_threshold?: number, match_count?: number }
 * Response: { results: EvidenceResult[], count: number }
 *
 * Environment variables:
 *   - GEMINI_API_KEY: Google Gemini API key for generating query embeddings
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Default search parameters
const DEFAULT_MATCH_THRESHOLD = 0.5; // 50% similarity minimum
const DEFAULT_MATCH_COUNT = 20; // Maximum results to return
const MAX_MATCH_COUNT = 100; // Hard limit to prevent abuse

// Response type matching the match_evidence RPC function return
interface SearchResult {
    id: number;
    'ID / SKU': string | null;
    'Název': string | null;
    'Kategorie': string | null;
    'Umístění': string | null;
    'Množství': string | null;
    'Jednotka': string | null;
    'Poznámka': string | null;
    similarity: number;
}

/**
 * Generates embedding for the search query using Google Gemini
 * Uses gemini-embedding-001 model which returns 3072 dimensions
 * Truncates to 768 dimensions to fit Supabase pgvector limits
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: {
                    parts: [{ text: query }],
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const fullEmbedding = data.embedding?.values;

    if (!fullEmbedding || !Array.isArray(fullEmbedding)) {
        throw new Error('Invalid embedding response from Gemini API');
    }

    // Truncate to 768 dimensions to match stored embeddings
    const truncatedEmbedding = fullEmbedding.slice(0, 768);

    return truncatedEmbedding;
}

/**
 * Performs vector search using Supabase RPC
 */
async function performVectorSearch(
    embedding: number[],
    matchThreshold: number,
    matchCount: number
): Promise<SearchResult[]> {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    const { data, error } = await supabase.rpc('match_evidence', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
    });

    if (error) {
        throw new Error(`Vector search failed: ${error.message}`);
    }

    return data || [];
}

/**
 * Main handler for Vercel serverless function
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<VercelResponse | void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    console.log(`[Vector Search] ${req.method} request received`);

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only POST requests are supported',
        });
    }

    // Check environment configuration
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[Vector Search] Missing environment variables');
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Required environment variables are not configured',
        });
    }

    try {
        // Parse request body
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch {
                return res.status(400).json({
                    error: 'Invalid request',
                    message: 'Request body must be valid JSON',
                });
            }
        }

        const { query, match_threshold, match_count } = body || {};

        // Validate query
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Query parameter is required and must be a string',
            });
        }

        // Validate and sanitize parameters
        const matchThreshold = typeof match_threshold === 'number'
            ? Math.max(0, Math.min(1, match_threshold))
            : DEFAULT_MATCH_THRESHOLD;

        const matchCount = typeof match_count === 'number'
            ? Math.min(Math.max(1, match_count), MAX_MATCH_COUNT)
            : DEFAULT_MATCH_COUNT;

        console.log(`[Vector Search] Query: "${query}" | Threshold: ${matchThreshold} | Count: ${matchCount}`);

        // Step 1: Generate embedding for the query
        console.log('[Vector Search] Generating query embedding...');
        const queryEmbedding = await generateQueryEmbedding(query);

        // Step 2: Perform vector search
        console.log('[Vector Search] Executing vector search...');
        const results = await performVectorSearch(
            queryEmbedding,
            matchThreshold,
            matchCount
        );

        console.log(`[Vector Search] Found ${results.length} results`);

        // Return results
        return res.status(200).json({
            results,
            count: results.length,
            query,
            threshold: matchThreshold,
        });

    } catch (error) {
        console.error('[Vector Search] Error:', error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('GEMINI_API_KEY')) {
                return res.status(500).json({
                    error: 'Configuration error',
                    message: 'Gemini API is not properly configured',
                });
            }

            if (error.message.includes('Supabase')) {
                return res.status(500).json({
                    error: 'Database error',
                    message: 'Database connection failed',
                });
            }

            if (error.message.includes('rate limit') || error.message.includes('quota')) {
                return res.status(429).json({
                    error: 'Rate limited',
                    message: 'API rate limit exceeded. Please try again later.',
                });
            }
        }

        // Generic error response
        return res.status(500).json({
            error: 'Search failed',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }
}
