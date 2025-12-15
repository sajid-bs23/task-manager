-- Migration: Fix RLS Recursion in Chat

-- 1. Helper Function (Security Definer to bypass RLS)
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

-- 2. Update Policy for conversation_participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants of their conversations"
    ON public.conversation_participants FOR SELECT TO authenticated
    USING (
        -- Simple: I can see myself
        user_id = auth.uid() 
        OR 
        -- Recursive-safe check: Use the security definer function
        is_participant(conversation_id)
    );
