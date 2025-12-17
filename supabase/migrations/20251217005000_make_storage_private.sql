-- Make attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'attachments';

-- Drop existing public policy
DROP POLICY IF EXISTS "Public can view attachments" ON storage.objects;

-- Add policy for board members to SELECT (view/download) attachments
CREATE POLICY "Board members can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'attachments' AND
    EXISTS (
        SELECT 1 FROM task_attachments ta
        JOIN tasks t ON ta.task_id = t.id
        JOIN columns c ON t.column_id = c.id
        WHERE ta.file_path = name
        AND is_board_member(c.board_id)
    )
);

-- Update existing INSERT policy to be more specific
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Board members can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'attachments'
);

-- Update DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;
CREATE POLICY "Board members can delete attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'attachments' AND
    EXISTS (
        SELECT 1 FROM task_attachments ta
        JOIN tasks t ON ta.task_id = t.id
        JOIN columns c ON t.column_id = c.id
        WHERE ta.file_path = name
        AND is_board_member(c.board_id)
    )
);
