-- Migration: Break Recursion with Simple Policy

-- 1. Reset Policy for conversation_participants
-- We restrict it to ONLY allow users to see their OWN participation rows.
-- This prevents the infinite loop where checking "am I in the group?" triggers "can I see the group?" -> "am I in the group?"
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view own participation"
    ON public.conversation_participants FOR SELECT TO authenticated
    USING ( user_id = auth.uid() );

-- 2. Ensure Messages still uses the function (which works because it checks user_id = auth.uid())
-- No change needed to messages policy if it uses is_participant, 
-- because is_participant essentially runs the same check as above, which is now allowed and non-recursive.

-- 3. Ensure 'conversations' table allows viewing if you are a participant
-- The policy checks is_participant(id). 
-- is_participant checks conversation_participants for (conv_id, me).
-- This is allowed by "Users can view own participation".
-- So this chain works.

-- 4. Re-apply ownership just in case
ALTER FUNCTION public.is_participant(UUID) OWNER TO postgres;
