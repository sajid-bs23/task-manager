-- Migration: Robust Chat RLS

-- 1. Ensure is_participant is working correctly
CREATE OR REPLACE FUNCTION public.is_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.conversation_participants 
        WHERE conversation_id = p_conversation_id 
        AND user_id = auth.uid()
    );
END;
$$;

-- 2. Update Messages Policy to use the function directly
-- This avoids the "Select from conversation_participants" -> "Policy on conversation_participants" -> "Recursion/Block" chain.
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT TO authenticated
    USING ( is_participant(conversation_id) );

CREATE POLICY "Users can send messages to their conversations"
    ON public.messages FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND
        is_participant(conversation_id)
    );

-- 3. Update Conversations Policy too for consistency
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
    ON public.conversations FOR SELECT TO authenticated
    USING ( is_participant(id) );
