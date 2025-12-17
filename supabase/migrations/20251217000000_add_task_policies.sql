-- Add missing RLS policies for tasks

-- INSERT
DROP POLICY IF EXISTS "Board members can create tasks" ON tasks;
CREATE POLICY "Board members can create tasks"
ON tasks FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM columns 
        WHERE columns.id = column_id 
        AND is_board_member(columns.board_id)
    )
);

-- UPDATE
DROP POLICY IF EXISTS "Board members can update tasks" ON tasks;
CREATE POLICY "Board members can update tasks"
ON tasks FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM columns 
        WHERE columns.id = column_id 
        AND is_board_member(columns.board_id)
    )
);

-- DELETE
DROP POLICY IF EXISTS "Board members can delete tasks" ON tasks;
CREATE POLICY "Board members can delete tasks"
ON tasks FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM columns 
        WHERE columns.id = column_id 
        AND is_board_member(columns.board_id)
    )
);
