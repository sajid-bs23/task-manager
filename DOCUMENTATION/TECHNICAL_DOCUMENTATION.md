# Task Manager Project - Technical Documentation

## 1. Executive Summary
The Task Manager is a collaborative, real-time project management tool modeled after Kanban boards (e.g., Trello). It allows users to create boards, invite members, manage tasks across columns, and communicate via real-time chat and comments. The system is built on a **React** frontend and a **Supabase** backend, providing robust authentication, real-time data synchronization, and secure data access via Row Level Security (RLS).

## 2. Architecture Overview
The application follows a client-server serverless architecture:

*   **Frontend**: Single Page Application (SPA) built with React and Vite. It communicates with Supabase APIs (REST and Realtime WebSocket).
*   **Backend**: Supabase (PostgreSQL) acts as the primary data store and authentication provider.
*   **Edge Functions**: Custom logic for complex operations (e.g., task assignment notifications, advanced card interactions) is handled via Deno-based Supabase Edge Functions.
*   **Security**: Data access is governed strictly by Postgres Row Level Security (RLS) policies, ensuring users only access boards and tasks they are authorized to see.

## 3. Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: TailwindCSS
- **State Management**: React Hooks + Local State (optimistic UI updates)
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Routing**: `react-router-dom`
- **Rich Text**: `react-quill-new`
- **Icons**: `lucide-react`
- **Date Handling**: `date-fns`
- **Supabase Client**: `@supabase/supabase-js`

### Backend (Supabase)
- **Database**: PostgreSQL 15
- **Authentication**: Supabase Auth (Email/Password)
- **API**: Auto-generated REST API + GraphQL (PostgREST)
- **Realtime**: Postgres changes broadcast via WebSocket
- **Storage**: Supabase Storage (for attachments)

## 4. Database Schema
The database is designed with standard relational normalization.

### Core Tables
- **`profiles`**: Stores user metadata (name, avatar). Linked to `auth.users`.
- **`boards`**: Top-level container. Contains `title`, `description`, `owner_id`.
- **`board_members`**: Link table for M:N relationship between `boards` and `profiles`. Stores `role` (owner/member).
- **`columns`**: Vertical lists within a board. Stores `position` for ordering.
- **`tasks`**: Work items. Contains `title`, `description`, `assignee_id`, `position`.
    - **Note**: `assignee_id` triggers notifications upon change.

### Interactions & Metadata
- **`task_relationships`**: Self-referencing table for task dependencies.
    - Types: `blocks`, `blocked_by`, `relates_to`.
    - Includes `source_task_id` and `target_task_id`.
- **`task_comments`**: Activity stream on a task. Linked to `profiles`.
- **`notifications`**: System alerts for users (e.g., "You were assigned to...").
- **`messages`**: Real-time chat messages for board conversations.

## 5. Backend Logic & Security

### Row Level Security (RLS)
Security is implemented at the database layer. Central logic uses the `is_board_member(board_uuid)` SQL function to verify access.
- **Boards**: Viewable by owner and members.
- **Tasks/Columns**: Inherit access from their parent Board.
- **Notifications**: Users can only view their own notifications.

### Edge Functions
Located in `supabase/functions/`.
1.  **`tasks`**: 
    - Handles task updates.
    - **Logic**: When a task's `assignee_id` changes, it automatically creates a notification record for the new assignee.
2.  **`card-interactions`**:
    - Handles complex queries for the Task Detail Modal.
    - Actions: `get_comments`, `add_comment`, `get_relationships`, `search_tasks` (sorted by `created_at desc` for "Recent" functionality).

### Realtime
The application subscribes to Supabase Realtime channels for:
- **Board Updates**: Instant reflection of column/task moves by other users.
- **Chat**: Instant delivery of messages.
- **Notifications**: "New Notification" toasts without refreshing.
- **Task Activity**: Comments appearing instantly in the modal.

## 6. Frontend Features

### Board View (`BoardView.jsx`)
- **Drag and Drop**: Users can drag tasks between columns and reorder columns.
- **Optimistic UI**: Interface updates immediately before the server responds to ensure fluidity.
- **Realtime Sync**: Listens for Postgres changes to update state if another user makes changes.

### Task Detail Modal (`TaskDetailModal.jsx`)
- **Rich Text Editor**: For task descriptions.
- **Assignee Selector**: Assigns board members to tasks.
- **Task Links**: Search and add relationships (blocks/relates to) to other tasks.
- **Activity Stream**: Real-time comments.
- **Inline Editing**: Double-click task title to rename.

### Chat
- integrated real-time chat side panel for board discussions.

## 7. Deployment
- **Frontend**: Hosted on **Netlify**.
    - **Build**: Run `npm run build` to generate the static assets in the `dist` directory.
    - **Deploy**: Manually drag and drop the `dist` folder into the Netlify deployment interface.
- **Edge Functions**: Deployed via Supabase CLI (`npx supabase functions deploy`).
- **Database**: Managed by Supabase Migrations (`supabase/migrations/*.sql`).
