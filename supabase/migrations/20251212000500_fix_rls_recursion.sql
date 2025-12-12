-- FIX RLS RECURSION
-- Approach: Use a SECURITY DEFINER function to check membership.
-- This bypasses RLS when checking "am I a member of this board" to avoid the loop.

-- 1. Create helper function for membership check
CREATE OR REPLACE FUNCTION is_board_member(check_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: Bypasses RLS
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM board_members
        WHERE board_id = check_board_id
        AND user_id = auth.uid()
    );
END;
$$;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view boards they belong to" ON boards;
DROP POLICY IF EXISTS "Members can view other members of their boards" ON board_members;
DROP POLICY IF EXISTS "Owners can manage board members" ON board_members;

-- 3. Re-create BOARDS policies
CREATE POLICY "Users can view boards they belong to"
ON boards FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid() OR
    is_board_member(id) -- Uses the secure function
);

-- 4. Re-create BOARD MEMBERS policies
-- "I can see a board member entry IF:"
-- 1. It is ME.
-- 2. OR it is for a board that I am a member of (including owner).

CREATE POLICY "Members can view other members of their boards"
ON board_members FOR SELECT
TO authenticated
USING (
    -- I can always see my own membership rows
    user_id = auth.uid()
    OR
    -- I can see rows for boards where I am a member
    is_board_member(board_id)
);

-- Re-apply owner management policy (simplified)
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
