-- Create transactions table for borrowing/taking parts
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES "Evidence"(id) ON DELETE CASCADE,
    person_name TEXT,
    amount INTEGER NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('borrow', 'take')),
    duration_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    returned_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Create index for faster lookups by item_id
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);

-- Create index for active transactions (not returned)
CREATE INDEX IF NOT EXISTS idx_transactions_active ON transactions(returned_at) WHERE returned_at IS NULL;

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for anonymous users (since all visitors are guests)
CREATE POLICY "Allow all operations on transactions" ON transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);
