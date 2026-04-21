-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-pictures', 'profile-pictures', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']);

-- Enable public access to the bucket
CREATE POLICY "Public Access Profile Pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Allow authenticated users to upload profile pictures
CREATE POLICY "Upload Profile Pictures"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'profile-pictures');

-- Allow users to update their own profile pictures
CREATE POLICY "Update Profile Pictures"
ON storage.objects FOR UPDATE
TO public
WITH CHECK (bucket_id = 'profile-pictures');

-- Allow users to delete their own profile pictures
CREATE POLICY "Delete Profile Pictures"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'profile-pictures');
