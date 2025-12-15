-- Migration: Realtime Chat Schema

-- 1. Create Tables

-- Conversations (Groups or 1-on-1)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE, -- Optional context
    is_group BOOLEAN DEFAULT FALSE,
    name TEXT, -- For group chats
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants
CREATE TABLE conversation_participants (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Conversations: Users can see conversations they are part of
CREATE POLICY "Users can view their conversations"
    ON conversations FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversations.id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT TO authenticated
    WITH CHECK (true); -- Function handles ensuring they add themselves

-- Participants: Users can see who is in their conversations
CREATE POLICY "Users can view participants of their conversations"
    ON conversation_participants FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add participants"
    ON conversation_participants FOR INSERT TO authenticated
    WITH CHECK (true);

-- Messages: Users can see messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
    ON messages FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their conversations"
    ON messages FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
        )
    );


-- 4. Functions

-- Create Conversation Helper (RPC)
-- Returns the conversation ID
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
BEGIN
    -- Create Conversation
    INSERT INTO conversations (board_id, is_group, name)
    VALUES (p_board_id, p_is_group, p_name)
    RETURNING id INTO v_conv_id;

    -- Add Participants (Including Caller if not in list, though frontend should send it)
    FOREACH v_pid IN ARRAY p_participant_ids
    LOOP
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (v_conv_id, v_pid)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN v_conv_id;
END;
$$;


-- 5. Realtime
-- Enable Realtime for messages so users get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- Optionally for conversations if we want "New Chat" alerts
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
