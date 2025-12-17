-- DIAGNOSTIC: Disable RLS to check if it's blocking Realtime
ALTER TABLE task_attachments DISABLE ROW LEVEL SECURITY;

-- Ensure it is in the publication (Force it)
ALTER PUBLICATION supabase_realtime DROP TABLE task_attachments; -- Drop first to be sure
ALTER PUBLICATION supabase_realtime ADD TABLE task_attachments;
