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

        // Prepare items summary for the AI with more context
        const itemsSummary = items.map((item, index) => {
            const name = item['Název'] || 'Neznámý název';
            const category = item['Kategorie'] || 'Neznámá kategorie';
            const sku = item['ID / SKU'] || '';
            const location = item['Umístění'] || '';
            const note = item['Poznámka'] || '';
            const quantity = item['Množství'] || '0';

            // Create a rich description for the AI
            let description = `[${index}] ${name}`;
            if (category) description += ` | Kategorie: ${category}`;
            if (sku) description += ` | SKU: ${sku}`;
            if (location) description += ` | Umístění: ${location}`;
            if (note) description += ` | Poznámka: ${note}`;
            if (quantity) description += ` | Množství: ${quantity}`;

            return description;
        }).join('\n');

        const systemPrompt = `Jsi inteligentní asistent pro vyhledávání IT komponentů a elektronických součástek v inventáři.

Tvým úkolem je najít relevantní položky na základě přirozeného jazykového dotazu uživatele.

Pokud uživatel hledá například:
- "síťové komponenty" → hledej položky z kategorie "Síťové komponenty" nebo s názvy obsahujícími: switch, router, kabel, ethernet, RJ45, WiFi, anténa
- "napájení" → hledej položky z kategorie "Napájecí zdroje" nebo s názvy obsahujícími: zdroj, napájení, adaptér, DC, napětí
- "senzory" → hledej položky z kategorií "Senzory a detektory", "HVAC senzory" nebo s názvy obsahujícími: senzor, detektor, čidlo, PIR, teplota
- "pro místnost" → hledej komponenty vhodné pro instalaci v místnosti
- "automatizace" → hledej PLC, relé, moduly

Vrať POUZE JSON pole indexů (čísel) položek které jsou relevantní pro dotaz, seřazené od nejrelevantnější.
Vrať pouze platné JSON ve formátu: [0, 5, 2, 8]
Pokud žádná položka není relevantní, vrať prázdné pole: []`;

        const userPrompt = `Uživatel hledá: "${query}"

Dostupné položky v inventáři:
${itemsSummary}

Vrať JSON pole indexů relevantních položek (např. [0, 5, 2]):`;

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout

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
                    temperature: 0.3,
                    max_tokens: 500,
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
            const aiContent = groqData.choices?.[0]?.message?.content || '';

            console.log('AI response:', aiContent);

            // Parse the JSON response - try multiple patterns
            let resultIndices = [];

            try {
                // Try to find JSON array in the response
                const jsonMatch = aiContent.match(/\[[\s\S]*?\]/);
                if (jsonMatch) {
                    resultIndices = JSON.parse(jsonMatch[0]);
                } else {
                    // Try to find numbers separated by commas
                    const numberMatch = aiContent.match(/\d+/g);
                    if (numberMatch) {
                        resultIndices = numberMatch.map(n => parseInt(n, 10));
                    }
                }
            } catch (parseError) {
                console.error('Failed to parse AI response:', aiContent, parseError);
                resultIndices = [];
            }

            // Validate and deduplicate indices
            const validIndices = [...new Set(resultIndices)].filter(
                (idx) => Number.isInteger(idx) && idx >= 0 && idx < items.length
            );

            console.log('Valid indices:', validIndices);

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
