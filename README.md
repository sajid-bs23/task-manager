# Task Manager

A full-featured task management application built with React, Vite, and Supabase.

## Features

- ✅ User authentication (sign up/sign in)
- ✅ Board management with drag-and-drop
- ✅ Real-time updates using Supabase subscriptions
- ✅ Task management with columns
- ✅ File attachments (max 3 per task)
- ✅ Threaded comments
- ✅ Time logging
- ✅ Assignee management
- ✅ Notifications
- ✅ Board member collaboration

## Setup

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your_key.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbxxxxxxxxxxxxxxxxxCJ9.eyJpxxxxxxxxxxxxxxxxxCI6MjA4MDg0NDQzNn0.Au6H3huIqTxxxxxxCK0
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_Sxxxxxxxg_GVxxxxxqd
```

**Note:** The code will use `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` if available, otherwise it falls back to `VITE_SUPABASE_ANON_KEY`.

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Supabase Setup

The project is already connected to the remote Supabase project "TaskManager".

### Database Migrations

Migrations have been applied to the remote database. The schema includes:
- Profiles
- Boards and board members
- Columns and tasks
- Task attachments
- Task comments (threaded)
- Time logs
- Notifications

### Edge Functions

Two edge functions are deployed:
- `send-notification` - Sends notifications to users
- `handle-task-update` - Handles task updates and notifications

### Storage

The `task-attachments` bucket is configured with RLS policies for secure file uploads.

## Project Structure

```
src/
├── components/
│   ├── auth/          # Login and signup forms
│   ├── board/         # Board, Column, Task components
│   ├── common/        # Navbar, Notifications
│   └── layout/        # Layout components
├── hooks/             # Custom React hooks
│   ├── useAuth.js     # Authentication
│   ├── useBoards.js   # Board management
│   ├── useTasks.js    # Task management
│   └── useRealtime.js # Real-time subscriptions
├── lib/               # Utilities
│   ├── api.js         # API functions
│   └── supabase.js    # Supabase client
└── pages/             # Page components
    ├── Login.jsx
    ├── Home.jsx
    └── BoardView.jsx
```

## Technologies

- **React 19** - UI framework
- **Vite** - Build tool
- **Supabase** - Backend (Auth, Database, Storage, Realtime)
- **Tailwind CSS** - Styling
- **@dnd-kit** - Drag and drop
- **React Router** - Routing
- **Zustand** - State management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
