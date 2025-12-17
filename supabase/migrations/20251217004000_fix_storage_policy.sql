-- Allow authenticated users to delete their own uploaded files (or any file in attachments if they are board members)
-- Simplified: Authenticated users can delete from 'attachments' bucket
CREATE POLICY "Authenticated users can delete attachments"
ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'attachments' );
