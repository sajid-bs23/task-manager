-- Enable Realtime for tables
-- We drop and recreate to ensure a clean state for this publication
DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE 
    boards, 
    columns, 
    tasks, 
    board_members, 
    profiles;
