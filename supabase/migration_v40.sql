-- Migration v40: Add in_shop flag to virtual_clothing_items
ALTER TABLE virtual_clothing_items ADD COLUMN IF NOT EXISTS in_shop BOOLEAN DEFAULT true;
