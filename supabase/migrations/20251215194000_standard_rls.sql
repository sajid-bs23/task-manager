-- Migration: Standardize Chat RLS (No Functions)

-- 1. Messages: Use standard subquery
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can view messages"
    ON public.messages FOR SELECT TO authenticated
    USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND
        conversation_id IN (
            SELECT conversation_id 
            FROM public.conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

-- 2. Conversations: Use standard subquery
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can view conversations"
    ON public.conversations FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT conversation_id 
            FROM public.conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT TO authenticated
    WITH CHECK (true);

-- 3. Participants: STRICT User-Only (No recursion)
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view own participation" ON public.conversation_participants;

-- Allow viewing only YOUR OWN row. 
-- Note: This means you can't query "Who is in this chat?" via this table directly.
-- You must rely on the fact that you have the Conversation ID.
CREATE POLICY "Users can view own participation"
    ON public.conversation_participants FOR SELECT TO authenticated
    USING ( user_id = auth.uid() );

CREATE POLICY "Users can join conversations"
    ON public.conversation_participants FOR INSERT TO authenticated
    WITH CHECK ( user_id = auth.uid() ); 
    -- Note: RPC uses SECURITY DEFINER so it bypasses this CHECK for adding *others*.
