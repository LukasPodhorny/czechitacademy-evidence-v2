import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { images, categories } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'No images provided' });
        }

        // Use Gemini 1.5 Flash model for vision tasks
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

        // Prepare image parts from base64 data
        const imageParts = images.map(img => ({
            inlineData: {
                data: img.base64,
                mimeType: img.mimeType || 'image/jpeg'
            }
        }));

        const categoriesList = categories && categories.length > 0
            ? `Available categories: ${categories.join(', ')}`
            : 'Available categories: Microcontrollers, Resistors, Capacitors, LEDs, Sensors, Cables, Tools, Power Supplies, Development Boards, Motors, Displays, Connectors, Switches, Batteries, Other';

        const prompt = `Analyze these ${images.length} image(s) of an electronic component or part and extract the following information:

1. ID / SKU - Any product code, part number, or SKU visible on the component or packaging
2. Název (Name) - The name/type of the component (e.g., "Arduino Uno Rev3", "Resistor 10kΩ", "Síťový ethernetový kabel RJ-45", "Myš Dell MS 116", "LED dioda", etc.)
3. Kategorie (Category) - Choose ONLY from the available categories below. Pick the best match based on the component type:
   ${categoriesList}
4. Množství (Quantity) - The quantity if multiple objects visible in the image
5. Poznámka (Note) - Any additional specifications visible: voltage, current, resistance, capacitance, pin count, dimensions, manufacturer, or other technical details

IMPORTANT: 
- For Kategorie, you MUST choose one from the available categories list above. Do not invent new categories.
- Umístění (Location) and Jednotka (Unit) will be set automatically, do not include them.

Return ONLY a JSON object with these exact field names:
{
    "idSku": "...",
    "nazev": "...",
    "kategorie": "...",
    "mnozstvi": "...",
    "poznamka": "..."
}

If any information is not visible or cannot be determined, use empty string "" for text fields or "1" for quantity. Be precise and extract exact values from labels, markings, and packaging.`;

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from the response
        let jsonMatch = text.match(/\{[\s\S]*\}/);
        let extractedData;

        if (jsonMatch) {
            try {
                extractedData = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.error('Failed to parse JSON from response:', text);
                return res.status(500).json({ error: 'Failed to parse AI response' });
            }
        } else {
            console.error('No JSON found in response:', text);
            return res.status(500).json({ error: 'Invalid AI response format' });
        }

        // Map to the expected format - Umístění and Jednotka are always empty/default
        const mappedData = {
            'ID / SKU': extractedData.idSku || extractedData.ID || extractedData.sku || extractedData.partNumber || '',
            'Název': extractedData.nazev || extractedData.name || extractedData.Název || '',
            'Kategorie': extractedData.kategorie || extractedData.category || extractedData.Kategorie || '',
            'Umístění': '',
            'Množství': extractedData.mnozstvi || extractedData.quantity || extractedData.Množství || '1',
            'Jednotka': '',
            'Poznámka': extractedData.poznamka || extractedData.note || extractedData.notes || extractedData.Poznámka || ''
        };

        return res.status(200).json({
            success: true,
            data: mappedData
        });

    } catch (error) {
        console.error('AI recognition error:', error);
        return res.status(500).json({
            error: 'Failed to process images',
            details: error.message
        });
    }
}
