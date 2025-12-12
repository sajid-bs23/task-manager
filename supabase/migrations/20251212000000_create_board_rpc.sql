-- Enable RLS on tables
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- BOARDS POLICIES
-- 1. View boards: Users can view boards they own OR are members of
CREATE POLICY "Users can view boards they belong to"
ON boards FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM board_members
        WHERE board_members.board_id = boards.id
        AND board_members.user_id = auth.uid()
    )
);

-- 2. Create boards: Authenticated users can create boards
CREATE POLICY "Users can create boards"
ON boards FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
);

-- 3. Update boards: Only owners can update
CREATE POLICY "Owners can update boards"
ON boards FOR UPDATE
TO authenticated
USING ( owner_id = auth.uid() );

-- 4. Delete boards: Only owners can delete
CREATE POLICY "Owners can delete boards"
ON boards FOR DELETE
TO authenticated
USING ( owner_id = auth.uid() );


-- BOARD MEMBERS POLICIES
-- 1. View members: Visible to members of the same board
CREATE POLICY "Members can view other members of their boards"
ON board_members FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM boards
        WHERE boards.id = board_members.board_id
        AND (
            boards.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM board_members as bm
                WHERE bm.board_id = boards.id
                AND bm.user_id = auth.uid()
            )
        )
    )
);

-- 2. Manage members: Only owners can add/remove members (simplified for now)
CREATE POLICY "Owners can manage board members"
ON board_members FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM boards
        WHERE boards.id = board_members.board_id
        AND boards.owner_id = auth.uid()
    )
);


-- RPC FUNCTION: create_board
-- Creates a board and adds the creator as an owner in board_members
CREATE OR REPLACE FUNCTION create_board(title TEXT, description TEXT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_board_id UUID;
    new_board RECORD;
BEGIN
    -- 1. Insert the board
    INSERT INTO boards (title, description, owner_id)
    VALUES (title, description, auth.uid())
    RETURNING id INTO new_board_id;

    -- 2. Insert the creator as a board member with 'owner' role
    INSERT INTO board_members (board_id, user_id, role)
    VALUES (new_board_id, auth.uid(), 'owner');

    -- 3. Return the created board data
    SELECT * INTO new_board FROM boards WHERE id = new_board_id;
    
    RETURN row_to_json(new_board);
END;
$$;
