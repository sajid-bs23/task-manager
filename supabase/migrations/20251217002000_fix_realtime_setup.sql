-- Ensure REPLICA IDENTITY is FULL for task_attachments so we get the ID on DELETE/UPDATE to filter by
ALTER TABLE task_attachments REPLICA IDENTITY FULL;

-- Ensure task_relationships also has FULL identity if we want to filter efficiently (though it uses compound key)
ALTER TABLE task_relationships REPLICA IDENTITY FULL;

-- Ensure both are in the publication
DO $$
BEGIN
  -- Task Attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'task_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_attachments;
  END IF;

  -- Task Relationships (Fixing the table name if it was missing)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'task_relationships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_relationships;
  END IF;
END
$$;
