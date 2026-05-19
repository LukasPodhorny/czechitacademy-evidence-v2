// Serverless function to fetch and modify data in Google Sheets
// Uses JWT authentication with Google Service Account

async function getAccessToken() {
    const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;

    const header = {
        alg: 'RS256',
        typ: 'JWT',
    };

    const payload = {
        iss: GOOGLE_CLIENT_EMAIL,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        exp: exp,
        iat: now,
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const crypto = await import('crypto');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    const signature = signer.sign(privateKey, 'base64url');

    const jwt = `${signingInput}.${signature}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    if (!tokenResponse.ok) {
        throw new Error('Failed to authenticate with Google');
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { SPREADSHEET_ID } = process.env;

    if (!SPREADSHEET_ID) {
        return res.status(500).json({ error: 'Missing SPREADSHEET_ID' });
    }

    try {
        const accessToken = await getAccessToken();

        // GET - Fetch all items
        if (req.method === 'GET') {
            const sheetsResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/List%201`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            if (!sheetsResponse.ok) {
                throw new Error('Failed to fetch data from Google Sheets');
            }

            const sheetsData = await sheetsResponse.json();
            const rows = sheetsData.values || [];

            if (rows.length < 2) {
                return res.json([]);
            }

            const headers = rows[0];
            const dataRows = rows.slice(1);

            const items = dataRows.map((row, index) => {
                const item = { _rowIndex: index + 2 }; // Store row index for updates (1-based, +1 for header)
                headers.forEach((header, colIndex) => {
                    const value = row[colIndex];
                    item[header] = value === undefined || value === '' ? null : value;
                });
                return item;
            });

            return res.json(items);
        }

        // POST - Add new item
        if (req.method === 'POST') {
            const { item } = req.body;

            if (!item) {
                return res.status(400).json({ error: 'Missing item data' });
            }

            // Get headers first to ensure correct order
            const sheetsResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/List%201!A1:G1`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            const headersData = await sheetsResponse.json();
            const headers = headersData.values?.[0] || ['ID / SKU', 'Název', 'Kategorie', 'Umístění', 'Množství', 'Jednotka', 'Poznámka'];

            // Map item to row array based on headers
            const row = headers.map(header => item[header] || '');

            const appendResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/List%201:append?valueInputOption=RAW`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        values: [row],
                    }),
                }
            );

            if (!appendResponse.ok) {
                const errorData = await appendResponse.text();
                console.error('Append error:', errorData);
                throw new Error('Failed to add item');
            }

            return res.json({ success: true });
        }

        // PUT - Update existing item
        if (req.method === 'PUT') {
            const { rowIndex, item } = req.body;

            if (!rowIndex || !item) {
                return res.status(400).json({ error: 'Missing rowIndex or item data' });
            }

            // Get headers
            const sheetsResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/List%201!A1:G1`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            const headersData = await sheetsResponse.json();
            const headers = headersData.values?.[0] || ['ID / SKU', 'Název', 'Kategorie', 'Umístění', 'Množství', 'Jednotka', 'Poznámka'];

            // Map item to row array
            const row = headers.map(header => item[header] || '');

            const updateResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/List%201!A${rowIndex}:G${rowIndex}?valueInputOption=RAW`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        values: [row],
                    }),
                }
            );

            if (!updateResponse.ok) {
                const errorData = await updateResponse.text();
                console.error('Update error:', errorData);
                throw new Error('Failed to update item');
            }

            return res.json({ success: true });
        }

        // DELETE - Delete item (clear row)
        if (req.method === 'DELETE') {
            const { rowIndex } = req.body;

            if (!rowIndex) {
                return res.status(400).json({ error: 'Missing rowIndex' });
            }

            // Get headers to know how many columns to clear
            const sheetsResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/List%201!A1:G1`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            const headersData = await sheetsResponse.json();
            const headers = headersData.values?.[0] || ['ID / SKU', 'Název', 'Kategorie', 'Umístění', 'Množství', 'Jednotka', 'Poznámka'];

            // Create empty row
            const emptyRow = new Array(headers.length).fill('');

            // Clear the row by setting all values to empty
            const clearResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/List%201!A${rowIndex}:${String.fromCharCode(64 + headers.length)}${rowIndex}?valueInputOption=RAW`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        values: [emptyRow],
                    }),
                }
            );

            if (!clearResponse.ok) {
                const errorData = await clearResponse.text();
                console.error('Delete error:', errorData);
                throw new Error('Failed to delete item');
            }

            return res.json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Error in sheets API:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
