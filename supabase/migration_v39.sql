-- Migration v39: Add image support fields to virtual_clothing_items
ALTER TABLE virtual_clothing_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE virtual_clothing_items ADD COLUMN IF NOT EXISTS img_x INTEGER DEFAULT -31;
ALTER TABLE virtual_clothing_items ADD COLUMN IF NOT EXISTS img_y INTEGER DEFAULT -36;
ALTER TABLE virtual_clothing_items ADD COLUMN IF NOT EXISTS img_w INTEGER DEFAULT 62;
ALTER TABLE virtual_clothing_items ADD COLUMN IF NOT EXISTS img_h INTEGER DEFAULT 77;

-- NOTE: Also create a public Supabase Storage bucket named "clothing"
-- Dashboard → Storage → New bucket → Name: "clothing" → Public: ON
