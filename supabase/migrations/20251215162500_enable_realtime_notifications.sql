-- Migration: Enable Realtime for Notifications Table

-- Add notifications table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
