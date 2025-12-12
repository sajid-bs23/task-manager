-- Fix Infinite Recursion in List Boards
-- Problem: Policy on 'boards' calls 'is_board_member', which (previously) queried 'boards'.
-- Solution: 'is_board_member' should ONLY check 'board_members' table.
-- Why is this safe?
-- Because "Owners" should ALWAYS be added to 'board_members' with role='owner'.
-- My 'create_board' RPC already does this.
-- So we can remove the check on 'boards' table inside 'is_board_member', breaking the loop.

CREATE OR REPLACE FUNCTION is_board_member(check_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM board_members
        WHERE board_id = check_board_id
        AND user_id = auth.uid()
    );
END;
$$;
