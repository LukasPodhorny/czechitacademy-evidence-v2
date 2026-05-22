-- Create storage bucket for part images
-- Note: This needs to be run in the Supabase Dashboard SQL Editor or via Supabase CLI
-- as storage bucket creation requires special permissions

-- Enable the storage schema
CREATE SCHEMA IF NOT EXISTS storage;

-- Create the bucket (this should be done via Supabase Dashboard or API)
-- In Supabase Dashboard: Storage > New Bucket > Name: "parts-images", Public: true

-- Set up security policies for the parts-images bucket
-- Allow anonymous uploads (since all visitors are guests)
CREATE POLICY "Allow anonymous uploads" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'parts-images');

-- Allow anonymous reads
CREATE POLICY "Allow anonymous reads" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'parts-images');

-- Allow anonymous updates (for replacing images)
CREATE POLICY "Allow anonymous updates" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'parts-images')
    WITH CHECK (bucket_id = 'parts-images');

-- Allow anonymous deletes
CREATE POLICY "Allow anonymous deletes" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'parts-images');
