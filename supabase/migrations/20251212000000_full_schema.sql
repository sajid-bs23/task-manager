-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- 2. Define Tables
-- Profiles
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boards
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board Members
CREATE TABLE board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- Columns
CREATE TABLE columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id UUID REFERENCES columns(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Attachments, Comments, Time Logs, Notifications (Simplified for now)
CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    description TEXT,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. Security (RLS) Helper Functions
-- Function to safely check board membership (including OWNERS)
CREATE OR REPLACE FUNCTION is_board_member(check_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN 
        -- Check if user is the OWNER of the board
        EXISTS (
            SELECT 1 FROM boards
            WHERE id = check_board_id
            AND owner_id = auth.uid()
        )
        OR
        -- Check if user is in board_members
        EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = check_board_id
            AND user_id = auth.uid()
        );
END;
$$;


-- 4. RPC Functions
-- Create Board RPC
CREATE OR REPLACE FUNCTION create_board(title TEXT, description TEXT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_board_id UUID;
    new_board RECORD;
BEGIN
    INSERT INTO boards (title, description, owner_id)
    VALUES (title, description, auth.uid())
    RETURNING id INTO new_board_id;

    -- Add creator as member (owner role)
    INSERT INTO board_members (board_id, user_id, role)
    VALUES (new_board_id, auth.uid(), 'owner');

    SELECT * INTO new_board FROM boards WHERE id = new_board_id;
    RETURN row_to_json(new_board);
END;
$$;


-- 5. Enable RLS
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- 6. Define Policies

-- BOARDS
CREATE POLICY "Users can view boards they belong to"
ON boards FOR SELECT TO authenticated
USING ( owner_id = auth.uid() OR is_board_member(id) );

CREATE POLICY "Users can create boards"
ON boards FOR INSERT TO authenticated
WITH CHECK ( owner_id = auth.uid() );

CREATE POLICY "Owners can update boards"
ON boards FOR UPDATE TO authenticated
USING ( owner_id = auth.uid() );

CREATE POLICY "Owners can delete boards"
ON boards FOR DELETE TO authenticated
USING ( owner_id = auth.uid() );

-- BOARD MEMBERS
CREATE POLICY "Members can view other members of their boards"
ON board_members FOR SELECT TO authenticated
USING ( user_id = auth.uid() OR is_board_member(board_id) );

CREATE POLICY "Owners can manage board members"
ON board_members FOR ALL TO authenticated
USING ( 
    EXISTS (SELECT 1 FROM boards WHERE boards.id = board_members.board_id AND boards.owner_id = auth.uid()) 
);

-- COLUMNS
CREATE POLICY "Board members can view columns"
ON columns FOR SELECT TO authenticated
USING ( is_board_member(board_id) );

CREATE POLICY "Board members can create columns"
ON columns FOR INSERT TO authenticated
WITH CHECK ( is_board_member(board_id) );

CREATE POLICY "Board members can update columns"
ON columns FOR UPDATE TO authenticated
USING ( is_board_member(board_id) );

CREATE POLICY "Board members can delete columns"
ON columns FOR DELETE TO authenticated
USING ( is_board_member(board_id) );

-- TASKS (Placeholder for now, similar logic)
CREATE POLICY "Board members can view tasks"
ON tasks FOR SELECT TO authenticated
USING ( 
    EXISTS (SELECT 1 FROM columns WHERE columns.id = tasks.column_id AND is_board_member(columns.board_id))
);


-- 7. Storage (Buckets)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'attachments' );

CREATE POLICY "Public can view attachments"
ON storage.objects FOR SELECT TO public
USING ( bucket_id = 'attachments' );
