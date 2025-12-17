-- Policies for task_attachments

-- View: Board members can view attachments
CREATE POLICY "Board members can view attachments"
ON task_attachments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON tasks.column_id = columns.id
        WHERE tasks.id = task_attachments.task_id
        AND is_board_member(columns.board_id)
    )
);

-- Insert: Board members can upload attachments
CREATE POLICY "Board members can upload attachments"
ON task_attachments FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON tasks.column_id = columns.id
        WHERE tasks.id = task_id
        AND is_board_member(columns.board_id)
    )
);

-- Delete: Board members can delete attachments
CREATE POLICY "Board members can delete attachments"
ON task_attachments FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON tasks.column_id = columns.id
        WHERE tasks.id = task_id
        AND is_board_member(columns.board_id)
    )
);
