// Serverless function for managing borrow/take transactions
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    try {
        // GET - Fetch transactions for an item
        if (req.method === 'GET') {
            const { itemId } = req.query;

            if (!itemId) {
                return res.status(400).json({ error: 'Missing itemId parameter' });
            }

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/transactions?item_id=eq.${itemId}&order=created_at.desc`,
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
            return res.json(data);
        }

        // POST - Create new transaction (borrow or take)
        if (req.method === 'POST') {
            const { item_id, person_name, amount, transaction_type, duration_days, notes } = req.body;

            if (!item_id || !amount || !transaction_type) {
                return res.status(400).json({ error: 'Missing required fields: item_id, amount, transaction_type' });
            }

            // First, get current item quantity
            const itemResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/Evidence?id=eq.${item_id}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                }
            );

            if (!itemResponse.ok) {
                const errorText = await itemResponse.text();
                throw new Error(`Failed to fetch item: ${errorText}`);
            }

            const items = await itemResponse.json();
            if (items.length === 0) {
                return res.status(404).json({ error: 'Item not found' });
            }

            const item = items[0];
            const currentQuantity = parseInt(item['Množství'] || '0', 10);

            if (currentQuantity < amount) {
                return res.status(400).json({ error: 'Not enough items available' });
            }

            // Create transaction
            const transactionData = {
                item_id,
                person_name: person_name || null,
                amount,
                transaction_type,
                duration_days: duration_days || null,
                notes: notes || null,
            };

            const transactionResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/transactions`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify(transactionData),
                }
            );

            if (!transactionResponse.ok) {
                const errorText = await transactionResponse.text();
                throw new Error(`Failed to create transaction: ${errorText}`);
            }

            // Update item quantity
            const newQuantity = currentQuantity - amount;
            const updateResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/Evidence?id=eq.${item_id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 'Množství': newQuantity.toString() }),
                }
            );

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Failed to update item quantity: ${errorText}`);
            }

            const transactionResult = await transactionResponse.json();
            return res.status(201).json({ success: true, transaction: transactionResult[0] });
        }

        // PUT - Return borrowed items
        if (req.method === 'PUT') {
            const { transaction_id } = req.body;

            if (!transaction_id) {
                return res.status(400).json({ error: 'Missing transaction_id' });
            }

            // Get transaction details
            const transactionResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/transactions?id=eq.${transaction_id}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                }
            );

            if (!transactionResponse.ok) {
                const errorText = await transactionResponse.text();
                throw new Error(`Failed to fetch transaction: ${errorText}`);
            }

            const transactions = await transactionResponse.json();
            if (transactions.length === 0) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            const transaction = transactions[0];

            if (transaction.returned_at) {
                return res.status(400).json({ error: 'Items already returned' });
            }

            // Mark transaction as returned
            const updateTransactionResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/transactions?id=eq.${transaction_id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ returned_at: new Date().toISOString() }),
                }
            );

            if (!updateTransactionResponse.ok) {
                const errorText = await updateTransactionResponse.text();
                throw new Error(`Failed to update transaction: ${errorText}`);
            }

            // Return quantity to item (only for borrow, not for take)
            if (transaction.transaction_type === 'borrow') {
                const itemResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/Evidence?id=eq.${transaction.item_id}&select=*`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        },
                    }
                );

                if (itemResponse.ok) {
                    const items = await itemResponse.json();
                    if (items.length > 0) {
                        const item = items[0];
                        const currentQuantity = parseInt(item['Množství'] || '0', 10);
                        const newQuantity = currentQuantity + transaction.amount;

                        await fetch(
                            `${SUPABASE_URL}/rest/v1/Evidence?id=eq.${transaction.item_id}`,
                            {
                                method: 'PATCH',
                                headers: {
                                    'apikey': SUPABASE_ANON_KEY,
                                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ 'Množství': newQuantity.toString() }),
                            }
                        );
                    }
                }
            }

            return res.json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Error in transactions API:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
