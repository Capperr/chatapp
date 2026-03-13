-- v34: roulette table position/scale per room
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS roulette_gx INTEGER;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS roulette_gy INTEGER;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS roulette_scale FLOAT DEFAULT 1.0;
