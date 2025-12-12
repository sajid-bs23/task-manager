-- Enable UUID extension (use gen_random_uuid() which is built-in)
-- OR ensure uuid-ossp is properly loaded

-- Option 1: Use built-in gen_random_uuid() (PostgreSQL 13+, recommended)
-- No extension needed!

-- Option 2: If you want to use uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- Enable RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
                          id UUID REFERENCES auth.users(id) PRIMARY KEY,
                          email TEXT UNIQUE NOT NULL,
                          full_name TEXT,
                          avatar_url TEXT,
                          created_at TIMESTAMPTZ DEFAULT NOW(),
                          updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boards table (use gen_random_uuid() instead)
CREATE TABLE boards (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        title TEXT NOT NULL,
                        description TEXT,
                        owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board members (for collaboration)
CREATE TABLE board_members (
                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                               board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
                               user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
                               role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
                               created_at TIMESTAMPTZ DEFAULT NOW(),
                               UNIQUE(board_id, user_id)
);

-- Columns table
CREATE TABLE columns (
                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                         board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
                         title TEXT NOT NULL,
                         position INTEGER NOT NULL,
                         created_at TIMESTAMPTZ DEFAULT NOW(),
                         updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
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

-- Task attachments (max 3 per task)
CREATE TABLE task_attachments (
                                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
                                  file_name TEXT NOT NULL,
                                  file_path TEXT NOT NULL,
                                  file_type TEXT NOT NULL,
                                  file_size INTEGER NOT NULL,
                                  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task comments (threaded)
CREATE TABLE task_comments (
                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                               task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
                               user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
                               content TEXT NOT NULL,
                               parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
                               created_at TIMESTAMPTZ DEFAULT NOW(),
                               updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time logs
CREATE TABLE time_logs (
                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
                           user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
                           hours DECIMAL(5,2) NOT NULL,
                           description TEXT,
                           logged_at TIMESTAMPTZ DEFAULT NOW(),
                           created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                               user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
                               task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
                               type TEXT NOT NULL,
                               message TEXT NOT NULL,
                               read BOOLEAN DEFAULT FALSE,
                               created_at TIMESTAMPTZ DEFAULT NOW()
);