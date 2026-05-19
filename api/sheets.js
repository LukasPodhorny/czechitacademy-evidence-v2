// Serverless function to fetch data from Google Sheets
// Uses JWT authentication with Google Service Account

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { SPREADSHEET_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

        if (!SPREADSHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
            return res.status(500).json({ error: 'Missing environment variables' });
        }

        // Generate JWT token
        const now = Math.floor(Date.now() / 1000);
        const exp = now + 3600; // 1 hour

        const header = {
            alg: 'RS256',
            typ: 'JWT',
        };

        const payload = {
            iss: GOOGLE_CLIENT_EMAIL,
            scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
            aud: 'https://oauth2.googleapis.com/token',
            exp: exp,
            iat: now,
        };

        const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
        const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        // Sign with private key
        const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

        const crypto = await import('crypto');
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(signingInput);
        const signature = signer.sign(privateKey, 'base64url');

        const jwt = `${signingInput}.${signature}`;

        // Exchange JWT for access token
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
            const errorData = await tokenResponse.text();
            console.error('Token exchange failed:', errorData);
            return res.status(500).json({ error: 'Failed to authenticate with Google' });
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Fetch data from Google Sheets
        const sheetsResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/List%201`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!sheetsResponse.ok) {
            const errorData = await sheetsResponse.text();
            console.error('Sheets API failed:', errorData);
            return res.status(500).json({ error: 'Failed to fetch data from Google Sheets' });
        }

        const sheetsData = await sheetsResponse.json();
        const rows = sheetsData.values || [];

        if (rows.length < 2) {
            return res.json([]);
        }

        // Parse headers and data
        const headers = rows[0];
        const dataRows = rows.slice(1);

        const items = dataRows.map((row) => {
            const item = {};
            headers.forEach((header, index) => {
                const value = row[index];
                item[header] = value === undefined || value === '' ? null : value;
            });
            return item;
        });

        return res.json(items);
    } catch (error) {
        console.error('Error in sheets API:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
