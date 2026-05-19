#!/usr/bin/env node
/**
 * Embedding Generation Script
 *
 * This script generates vector embeddings for all existing items in the Evidence table
 * using Google Gemini API and updates the Supabase Evidence table with the embedding vectors.
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts
 *
 * Required environment variables:
 *   - GEMINI_API_KEY: Google Gemini API key
 *   - SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (for admin access)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables - try multiple possible locations
dotenv.config({ path: '.env' });

// If not found, try .env.local as fallback
if (!process.env.GEMINI_API_KEY) {
    dotenv.config({ path: '.env.local' });
}

// Environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY environment variable is required');
    console.error('   Please add GEMINI_API_KEY to your .env or .env.local file');
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    console.error('   Please add these to your .env or .env.local file');
    process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
console.log(`   Supabase URL: ${SUPABASE_URL?.substring(0, 30)}...`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Interface matching the Supabase Evidence table
interface EvidenceItem {
    id: number;
    'ID / SKU': string | null;
    'Název': string | null;
    'Kategorie': string | null;
    'Umístění': string | null;
    'Množství': string | null;
    'Jednotka': string | null;
    'Poznámka': string | null;
    embedding: number[] | null;
}

/**
 * Combines Evidence fields into a single text string for embedding generation
 * This creates a rich semantic representation of the item
 */
function createEmbeddingText(item: EvidenceItem): string {
    const parts: string[] = [];

    // Primary identifier - most important for search
    if (item['Název']) {
        parts.push(`Název: ${item['Název']}`);
    }

    // Category provides important context
    if (item['Kategorie']) {
        parts.push(`Kategorie: ${item['Kategorie']}`);
    }

    // SKU/ID for technical matching
    if (item['ID / SKU']) {
        parts.push(`SKU: ${item['ID / SKU']}`);
    }

    // Location for inventory context
    if (item['Umístění']) {
        parts.push(`Umístění: ${item['Umístění']}`);
    }

    // Note often contains descriptive keywords
    if (item['Poznámka']) {
        parts.push(`Poznámka: ${item['Poznámka']}`);
    }

    // Quantity and unit for completeness
    if (item['Množství'] && item['Jednotka']) {
        parts.push(`Množství: ${item['Množství']} ${item['Jednotka']}`);
    }

    return parts.join(' | ');
}

/**
 * Generates embedding vector using Google Gemini API
 * Uses gemini-embedding-001 model which returns 3072 dimensions
 * Truncates to 768 dimensions to fit Supabase pgvector limits
 */
async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: {
                        parts: [{ text }],
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

        // Gemini returns 3072 dimensions, but Supabase pgvector has 2000 limit
        // Truncate to 768 dimensions (first 1/4 of the vector)
        // This preserves most important information while fitting limits
        const truncatedEmbedding = fullEmbedding.slice(0, 768);

        return truncatedEmbedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

/**
 * Fetches all items from Supabase Evidence table that need embeddings
 */
async function fetchItemsWithoutEmbeddings(batchSize: number = 100): Promise<EvidenceItem[]> {
    const { data, error } = await supabase
        .from('Evidence')
        .select('*')
        .is('embedding', null)
        .limit(batchSize);

    if (error) {
        throw new Error(`Failed to fetch items: ${error.message}`);
    }

    return data || [];
}

/**
 * Fetches total count of items without embeddings
 */
async function countItemsWithoutEmbeddings(): Promise<number> {
    const { count, error } = await supabase
        .from('Evidence')
        .select('*', { count: 'exact', head: true })
        .is('embedding', null);

    if (error) {
        throw new Error(`Failed to count items: ${error.message}`);
    }

    return count || 0;
}

/**
 * Updates an Evidence item with its embedding vector
 */
async function updateItemEmbedding(itemId: number, embedding: number[]): Promise<void> {
    const { error } = await supabase
        .from('Evidence')
        .update({ embedding })
        .eq('id', itemId);

    if (error) {
        throw new Error(`Failed to update item ${itemId}: ${error.message}`);
    }
}

/**
 * Main processing function with rate limiting and batching
 */
async function processEmbeddings(): Promise<void> {
    console.log('🔧 Embedding Generation Script');
    console.log('============================\n');

    // Check remaining items
    const remainingCount = await countItemsWithoutEmbeddings();
    console.log(`📊 Items without embeddings: ${remainingCount}`);

    if (remainingCount === 0) {
        console.log('✅ All items already have embeddings!');
        return;
    }

    let processedCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    // Process in batches until all items are done
    while (true) {
        const items = await fetchItemsWithoutEmbeddings(10); // Small batch for rate limiting

        if (items.length === 0) {
            break;
        }

        console.log(`\n🔄 Processing batch of ${items.length} items...`);

        for (const item of items) {
            try {
                // Create rich text representation
                const text = createEmbeddingText(item);
                console.log(`  📝 ${item['Název'] || 'Unknown'} (${text.substring(0, 60)}...)`);

                // Generate embedding
                const embedding = await generateEmbedding(text);

                // Update in Supabase
                await updateItemEmbedding(item.id, embedding);

                processedCount++;
                console.log(`  ✅ Embedded (${processedCount}/${remainingCount})`);

                // Rate limiting: wait 100ms between requests
                // Gemini free tier allows ~1500 requests per minute
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                errorCount++;
                console.error(`  ❌ Error processing item ${item.id}:`, error);

                // Continue with next item, don't stop on single errors
                if (errorCount > 10) {
                    console.error('❌ Too many errors, stopping...');
                    throw new Error('Too many consecutive errors');
                }
            }
        }

        // Progress update
        const elapsedMinutes = (Date.now() - startTime) / 60000;
        const rate = processedCount / elapsedMinutes;
        const remaining = remainingCount - processedCount;
        const etaMinutes = remaining / rate;

        console.log(`\n📈 Progress: ${processedCount}/${remainingCount} (${((processedCount / remainingCount) * 100).toFixed(1)}%)`);
        console.log(`⏱️  Rate: ${rate.toFixed(1)} items/min | ETA: ${etaMinutes.toFixed(1)} min`);
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Complete! Processed ${processedCount} items in ${totalTime.toFixed(1)}s`);
    if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} errors encountered`);
    }
}

// Run the script
processEmbeddings()
    .then(() => {
        console.log('\n🎉 Embedding generation complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error);
        process.exit(1);
    });
