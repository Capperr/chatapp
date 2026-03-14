-- Migration v41: Storage RLS policies for clothing bucket
-- Run this after creating the public "clothing" bucket in Supabase Dashboard

-- Allow authenticated users to upload files to the clothing bucket
CREATE POLICY "clothing_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clothing');

-- Allow authenticated users to update (overwrite) files in the clothing bucket
CREATE POLICY "clothing_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'clothing');

-- Allow public read access (bucket is already public, but policy ensures it)
CREATE POLICY "clothing_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'clothing');

-- Allow authenticated users to delete files in the clothing bucket
CREATE POLICY "clothing_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'clothing');
