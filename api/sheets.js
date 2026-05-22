// Serverless function to fetch data from Supabase
// Replaces Google Sheets integration
// Now with automatic embedding generation for new items

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    try {
        // GET - Fetch all items from Supabase
        if (req.method === 'GET') {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/Evidence?select=*&order=id.asc`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase error: ${errorText}`);
            }

            const data = await response.json();

            // Map Supabase data to expected format (same as before)
            const items = data.map((row, index) => ({
                _rowIndex: row.id, // Use Supabase id for compatibility
                'ID / SKU': row['ID / SKU'] ?? null,
                'Název': row['Název'] ?? null,
                'Kategorie': row['Kategorie'] ?? null,
                'Umístění': row['Umístění'] ?? null,
                'Množství': row['Množství'] ?? null,
                'Jednotka': row['Jednotka'] ?? null,
                'Poznámka': row['Poznámka'] ?? null,
                image_url: row.image_url ?? null,
            }));

            return res.json(items);
        }

        // POST - Add new item with automatic embedding generation
        if (req.method === 'POST') {
            const { item } = req.body;

            if (!item) {
                return res.status(400).json({ error: 'Missing item data' });
            }

            // Generate embedding for the new item
            let embedding = null;
            if (GEMINI_API_KEY) {
                try {
                    embedding = await generateEmbedding(item);
                } catch (err) {
                    console.error('Failed to generate embedding:', err);
                    // Continue without embedding - it can be generated later
                }
            }

            // Prepare data for Supabase
            const supabaseData = {
                'ID / SKU': item['ID / SKU'],
                'Název': item['Název'],
                'Kategorie': item['Kategorie'],
                'Umístění': item['Umístění'],
                'Množství': item['Množství'],
                'Jednotka': item['Jednotka'],
                'Poznámka': item['Poznámka'],
                image_url: item.image_url || null,
                ...(embedding && { embedding }),
            };

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/Evidence`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify(supabaseData),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase error: ${errorText}`);
            }

            const data = await response.json();
            return res.status(201).json({ success: true, item: data[0] });
        }

        // PUT - Update item with automatic embedding generation
        if (req.method === 'PUT') {
            const { rowIndex, item } = req.body;

            if (!rowIndex || !item) {
                return res.status(400).json({ error: 'Missing rowIndex or item data' });
            }

            // Generate new embedding for the updated item
            let embedding = null;
            if (GEMINI_API_KEY) {
                try {
                    embedding = await generateEmbedding(item);
                } catch (err) {
                    console.error('Failed to generate embedding:', err);
                }
            }

            // Prepare data for Supabase
            const supabaseData = {
                'ID / SKU': item['ID / SKU'],
                'Název': item['Název'],
                'Kategorie': item['Kategorie'],
                'Umístění': item['Umístění'],
                'Množství': item['Množství'],
                'Jednotka': item['Jednotka'],
                'Poznámka': item['Poznámka'],
                image_url: item.image_url || null,
                ...(embedding && { embedding }),
            };

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/Evidence?id=eq.${rowIndex}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify(supabaseData),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase error: ${errorText}`);
            }

            const data = await response.json();
            return res.json({ success: true, item: data[0] });
        }

        // DELETE - Delete item
        if (req.method === 'DELETE') {
            const { rowIndex } = req.body;

            if (!rowIndex) {
                return res.status(400).json({ error: 'Missing rowIndex' });
            }

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/Evidence?id=eq.${rowIndex}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Supabase error: ${errorText}`);
            }

            return res.json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Error in sheets API:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

/**
 * Generates embedding for an item using Gemini API
 * Truncates 3072 dimensions to 768 for Supabase compatibility
 */
async function generateEmbedding(item) {
    const { GEMINI_API_KEY } = process.env;

    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    // Combine item fields into text (same logic as generate-embeddings.ts)
    const parts = [];
    if (item['Název']) parts.push(`Název: ${item['Název']}`);
    if (item['Kategorie']) parts.push(`Kategorie: ${item['Kategorie']}`);
    if (item['ID / SKU']) parts.push(`SKU: ${item['ID / SKU']}`);
    if (item['Umístění']) parts.push(`Umístění: ${item['Umístění']}`);
    if (item['Poznámka']) parts.push(`Poznámka: ${item['Poznámka']}`);
    if (item['Množství'] && item['Jednotka']) {
        parts.push(`Množství: ${item['Množství']} ${item['Jednotka']}`);
    }
    const text = parts.join(' | ');

    // Call Gemini API
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

    // Truncate to 768 dimensions (Supabase limit)
    return fullEmbedding.slice(0, 768);
}
