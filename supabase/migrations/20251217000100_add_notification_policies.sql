-- Add RLS policies for notifications

-- Enable Read access for own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT TO authenticated
USING ( user_id = auth.uid() );

-- Enable Insert access for authenticated users (required for Edge Function to send notifications)
-- Ideally, this would be scoped to "Board Members", but for now generalized access is sufficient for the app logic.
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
CREATE POLICY "Users can create notifications"
ON notifications FOR INSERT TO authenticated
WITH CHECK ( true );

-- Enable Update (Mark as read) for own notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE TO authenticated
USING ( user_id = auth.uid() );
