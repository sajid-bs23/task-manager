-- Add notifications table to Supabase Realtime publication
-- This ensures that INSERT/UPDATE events are sent to subscribed clients.

BEGIN;
  -- Try to add the table. If it's already there, this might fail, so we wrap in a transaction (conceptually).
  -- Actually, standard SQL doesn't have "ADD TABLE IF NOT EXISTS".
  -- We just run it. If it fails with "already member", the user can ignore.
  
  DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END
$$;

COMMIT;
