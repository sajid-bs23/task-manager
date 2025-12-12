-- Fix Task Permissions for Board Members

-- Ensure RLS is enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Board members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Board members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Board members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Board members can delete tasks" ON tasks;

-- 1. VIEW: Members can view tasks in columns of their boards
CREATE POLICY "Board members can view tasks"
ON tasks FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM columns
        WHERE columns.id = tasks.column_id
        AND is_board_member(columns.board_id)
    )
);

-- 2. CREATE: Members can create tasks in columns of their boards
CREATE POLICY "Board members can create tasks"
ON tasks FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM columns
        WHERE columns.id = column_id
        AND is_board_member(columns.board_id)
    )
);

-- 3. UPDATE: Members can update tasks (including moving to new columns)
-- USING: Check if OLD row is accessible (currently in a valid column)
-- WITH CHECK: Check if NEW row is accessible (moving to a valid column)
CREATE POLICY "Board members can update tasks"
ON tasks FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM columns
        WHERE columns.id = tasks.column_id
        AND is_board_member(columns.board_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM columns
        WHERE columns.id = column_id
        AND is_board_member(columns.board_id)
    )
);

-- 4. DELETE: Members can delete tasks
CREATE POLICY "Board members can delete tasks"
ON tasks FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM columns
        WHERE columns.id = tasks.column_id
        AND is_board_member(columns.board_id)
    )
);
