-- Add image_url column to Evidence table for storing part images
ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_evidence_image_url ON "Evidence"(image_url) WHERE image_url IS NOT NULL;
