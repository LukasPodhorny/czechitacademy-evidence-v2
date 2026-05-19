// Serverless function for AI-powered search using Groq API

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'Missing GROQ_API_KEY environment variable' });
    }

    try {
        const { query, items } = req.body;

        if (!query || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Missing query or items in request body' });
        }

        // Prepare items summary for the AI
        const itemsSummary = items.map((item, index) => {
            const name = item['Název'] || 'Neznámý název';
            const category = item['Kategorie'] || 'Neznámá kategorie';
            const sku = item['ID / SKU'] || '';
            const location = item['Umístění'] || '';
            const note = item['Poznámka'] || '';
            return `[${index}] ${name} (Kategorie: ${category}, SKU: ${sku}, Umístění: ${location}, Poznámka: ${note})`;
        }).join('\n');

        const systemPrompt = `Jsi asistent pro hledání IT vybavení. Dostaneš seznam položek ze skladu a dotaz uživatele v češtině.
Vrať POUZE JSON pole indexů (čísel) položek které jsou relevantní pro dotaz, seřazené od nejrelevantnější.
Vrať pouze pole čísel, žádný jiný text. Příklad: [2, 0, 5]
Pokud žádná položka není relevantní, vrať prázdné pole: []`;

        const userPrompt = `Dotaz uživatele: "${query}"

Seznam položek:
${itemsSummary}

Vrať pouze JSON pole indexů relevantních položek:`;

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

        try {
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.1,
                    max_tokens: 100,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Handle rate limiting
            if (groqResponse.status === 429) {
                return res.status(429).json({ error: 'rate_limit' });
            }

            if (!groqResponse.ok) {
                const errorData = await groqResponse.text();
                console.error('Groq API error:', errorData);
                return res.status(500).json({ error: 'AI search failed' });
            }

            const groqData = await groqResponse.json();
            const aiContent = groqData.choices?.[0]?.message?.content || '[]';

            // Parse the JSON response
            let resultIndices;
            try {
                // Try to extract JSON array from the response
                const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    resultIndices = JSON.parse(jsonMatch[0]);
                } else {
                    resultIndices = [];
                }
            } catch (parseError) {
                console.error('Failed to parse AI response:', aiContent);
                resultIndices = [];
            }

            // Validate indices are within bounds
            const validIndices = resultIndices.filter(
                (idx) => Number.isInteger(idx) && idx >= 0 && idx < items.length
            );

            return res.json({ indices: validIndices });
        } catch (fetchError) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
                return res.status(504).json({ error: 'timeout' });
            }

            throw fetchError;
        }
    } catch (error) {
        console.error('Error in AI search:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
