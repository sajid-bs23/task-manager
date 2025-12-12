-- 1. Create task_relationships table
CREATE TABLE task_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    target_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('blocks', 'blocked_by', 'relates_to')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_task_id, target_task_id) -- Prevent duplicate links
);

-- 2. Enable RLS
ALTER TABLE task_relationships ENABLE ROW LEVEL SECURITY;

-- 3. Policies for task_relationships
-- View: Board members can view relationships if they can view the source task
-- (Simplified: if you can view the board, you can view relationships)
CREATE POLICY "Board members can view relationships"
ON task_relationships FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON tasks.column_id = columns.id
        WHERE tasks.id = task_relationships.source_task_id
        AND is_board_member(columns.board_id)
    )
);

CREATE POLICY "Board members can create relationships"
ON task_relationships FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON tasks.column_id = columns.id
        WHERE tasks.id = source_task_id
        AND is_board_member(columns.board_id)
    )
);

CREATE POLICY "Board members can delete relationships"
ON task_relationships FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON tasks.column_id = columns.id
        WHERE tasks.id = source_task_id
        AND is_board_member(columns.board_id)
    )
);

-- 4. Policies for task_comments (Ensure they exist/are correct)
-- Drop existing if any to be safe
DROP POLICY IF EXISTS "Board members can view comments" ON task_comments;
DROP POLICY IF EXISTS "Board members can create comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON task_comments;

CREATE POLICY "Board members can view comments"
ON task_comments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON tasks.column_id = columns.id
        WHERE tasks.id = task_comments.task_id
        AND is_board_member(columns.board_id)
    )
);

CREATE POLICY "Board members can create comments"
ON task_comments FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks
        JOIN columns ON tasks.column_id = columns.id
        WHERE tasks.id = task_id
        AND is_board_member(columns.board_id)
    )
);

CREATE POLICY "Users can delete their own comments"
ON task_comments FOR DELETE TO authenticated
USING ( user_id = auth.uid() );
