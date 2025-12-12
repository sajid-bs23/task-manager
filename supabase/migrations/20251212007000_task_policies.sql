-- Enable RLS for tasks (already enabled in full_schema, but good to be safe)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (from full_schema placeholders) to avoid conflicts
DROP POLICY IF EXISTS "Board members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Board members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Board members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Board members can delete tasks" ON tasks;


-- 1. View Tasks
CREATE POLICY "Board members can view tasks"
ON tasks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM columns
        WHERE columns.id = tasks.column_id
        AND is_board_member(columns.board_id)
    )
);

-- 2. Create Tasks
CREATE POLICY "Board members can create tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM columns
        WHERE columns.id = column_id
        AND is_board_member(columns.board_id)
    )
);

-- 3. Update Tasks (Move, Rename, Edit)
CREATE POLICY "Board members can update tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM columns
        WHERE columns.id = tasks.column_id
        AND is_board_member(columns.board_id)
    )
);

-- 4. Delete Tasks
CREATE POLICY "Board members can delete tasks"
ON tasks FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM columns
        WHERE columns.id = tasks.column_id
        AND is_board_member(columns.board_id)
    )
);
