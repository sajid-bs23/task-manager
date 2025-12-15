-- Migration: Update create_conversation to Get-or-Create for 1-on-1

CREATE OR REPLACE FUNCTION create_conversation(
    p_board_id UUID,
    p_participant_ids UUID[],
    p_is_group BOOLEAN DEFAULT FALSE,
    p_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conv_id UUID;
    v_pid UUID;
    v_cnt INT;
BEGIN
    -- 1. If 1-on-1 (not group), check if conversation already exists
    IF p_is_group = FALSE THEN
        -- We want to find a conversation that has exactly these participants
        -- and is_group = false.
        -- Assuming p_participant_ids has 2 IDs (me and them).

        SELECT c.id INTO v_conv_id
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE c.is_group = FALSE
        AND cp.user_id = ANY(p_participant_ids)
        GROUP BY c.id
        HAVING COUNT(DISTINCT cp.user_id) = array_length(p_participant_ids, 1)
        AND COUNT(DISTINCT cp.user_id) = (
            SELECT COUNT(*) FROM conversation_participants cp2 WHERE cp2.conversation_id = c.id
        )
        LIMIT 1;
        
        IF v_conv_id IS NOT NULL THEN
            RETURN v_conv_id;
        END IF;
    END IF;

    -- 2. If no existing conversation, create a new one
    INSERT INTO conversations (board_id, is_group, name)
    VALUES (p_board_id, p_is_group, p_name)
    RETURNING id INTO v_conv_id;

    -- 3. Add Participants
    FOREACH v_pid IN ARRAY p_participant_ids
    LOOP
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (v_conv_id, v_pid)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN v_conv_id;
END;
$$;
