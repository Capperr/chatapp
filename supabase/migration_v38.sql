-- Migration v38: Add level_required to clothing items
ALTER TABLE virtual_clothing_items ADD COLUMN IF NOT EXISTS level_required INTEGER DEFAULT 0;
