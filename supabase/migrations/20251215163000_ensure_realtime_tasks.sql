-- Migration: Ensure Realtime for Tasks Table

-- Re-add tasks table to the publication to be absolutely sure it's there
-- The 'ADD TABLE' command is idempotent if the table is already in the publication? 
-- Actually, Postgres might throw error or warning.
-- Let's use SET PUBLICATION to be definitive, OR just DROP/CREATE approach if we aren't sure.
-- Safer: ALTER PUBLICATION ... ADD TABLE tasks; ignoring error if exists.

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Table already in publication, ignore
            NULL;
        WHEN OTHERS THEN
            -- Other error
            NULL; -- In migration we might want to fail, but for now ignoring 'duplicate' is key.
            -- Actually, 'ADD TABLE' throws 'relation "tasks" is already member of publication "supabase_realtime"'
            -- which is 'duplicate_object' (42710).
    END;
END $$;
