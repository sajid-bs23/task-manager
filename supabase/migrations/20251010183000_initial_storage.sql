-- Create bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false);

-- Storage policies
CREATE POLICY "Board members can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'task-attachments' AND
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON columns.id = tasks.column_id
        JOIN boards ON boards.id = columns.board_id
        WHERE (storage.foldername(name))[1] = tasks.id::text
        AND (
            boards.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM board_members
                WHERE board_members.board_id = boards.id
                AND board_members.user_id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Board members can view attachments"
ON storage.objects FOR SELECT
                                         TO authenticated
                                         USING (
                                         bucket_id = 'task-attachments' AND
                                         EXISTS (
                                         SELECT 1 FROM tasks
                                         JOIN columns ON columns.id = tasks.column_id
                                         JOIN boards ON boards.id = columns.board_id
                                         WHERE (storage.foldername(name))[1] = tasks.id::text
                                         AND (
                                         boards.owner_id = auth.uid() OR
                                         EXISTS (
                                         SELECT 1 FROM board_members
                                         WHERE board_members.board_id = boards.id
                                         AND board_members.user_id = auth.uid()
                                         )
                                         )
                                         )
                                         );

CREATE POLICY "Task creators and board owners can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'task-attachments' AND
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON columns.id = tasks.column_id
        JOIN boards ON boards.id = columns.board_id
        WHERE (storage.foldername(name))[1] = tasks.id::text
        AND (
            tasks.creator_id = auth.uid() OR
            boards.owner_id = auth.uid()
        )
    )
);