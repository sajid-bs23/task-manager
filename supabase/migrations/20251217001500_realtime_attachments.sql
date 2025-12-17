DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'task_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_attachments;
  END IF;
END
$$;
