# Task Manager API Documentation

This documentation details the API endpoints available in the Task Manager application.
The backend uses **Supabase Edge Functions**, which are invoked via HTTP requests.

## Authentication

All requests must include the Supabase Anonymous Key and a valid User Bearer Token (JWT).

**Headers:**

```http
Authorization: Bearer <USER_JWT_TOKEN>
```

**Base URL:**

`[SUPABASE_PROJECT_URL]/functions/v1`

---

## 1. Boards

### List Boards
Get a list of all boards visible to the user.

*   **Endpoint:** `/boards`
*   **Method:** `GET`

**Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Mobile App Launch",
    "description": "Tracking tasks for the Q1 Mobile App release",
    "created_at": "2024-01-15T10:00:00Z",
    "owner_id": "user-uuid-123"
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "title": "Marketing Campaign",
    "description": "Q2 Marketing Initiatives",
    "created_at": "2024-02-01T14:30:00Z",
    "owner_id": "user-uuid-123"
  }
]
```

### Create Board
Create a new board.

*   **Endpoint:** `/boards`
*   **Method:** `POST`

**Request Body:**

```json
{
  "title": "Website Redesign",
  "description": "Overhaul of the corporate website"
}
```

**Response:**

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440002",
  "title": "Website Redesign",
  "description": "Overhaul of the corporate website",
  "created_at": "2024-03-10T09:00:00Z",
  "owner_id": "user-uuid-123"
}
```

### Delete Board
Delete a board by ID.

*   **Endpoint:** `/boards?id={boardId}`
*   **Method:** `DELETE`

**Response:**

```json
{
  "message": "Deleted"
}
```

---

## 2. Board Members

Manage members of a board. This endpoint uses an RPC-style action pattern.

*   **Endpoint:** `/board-members`
*   **Method:** `POST`

### Invite Member

**Request Body:**

```json
{
  "action": "invite",
  "boardId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "developer@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User invited."
}
```

### Remove Member

**Request Body:**

```json
{
  "action": "remove",
  "boardId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "target-user-uuid-456"
}
```

**Response:**

```json
{
  "success": true
}
```

---

## 3. Columns

Manage columns within a board.

*   **Endpoint:** `/columns`
*   **Method:** `POST`

### Create Column

**Request Body:**

```json
{
  "action": "create",
  "boardId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "To Do",
  "position": 0
}
```

**Response:**

```json
{
  "id": "col-uuid-001",
  "board_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "To Do",
  "position": 0,
  "created_at": "2024-03-10T09:05:00Z"
}
```

### Update Column (Rename/Move)

**Request Body:**

```json
{
  "action": "update",
  "id": "col-uuid-001",
  "title": "Backlog",
  "position": 1
}
```

**Response:**

```json
{
  "success": true
}
```

### Delete Column

**Request Body:**

```json
{
  "action": "delete",
  "id": "col-uuid-001"
}
```

**Response:**

```json
{
  "success": true
}
```

### Reorder Columns (Batch)

**Request Body:**

```json
{
  "action": "reorder",
  "columns": [
    {
      "id": "col-uuid-001",
      "position": 0,
      "board_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "To Do"
    },
    {
      "id": "col-uuid-002",
      "position": 1,
      "board_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "In Progress"
    }
  ]
}
```

**Response:**

```json
{
  "success": true
}
```

---

## 4. Tasks

Manage tasks.

*   **Endpoint:** `/tasks`
*   **Method:** `POST`

### Create Task

**Request Body:**

```json
{
  "action": "create",
  "columnId": "col-uuid-001",
  "title": "Implement Login Screen",
  "position": 0
}
```

**Response:**

```json
{
  "id": "task-uuid-101",
  "column_id": "col-uuid-001",
  "title": "Implement Login Screen",
  "position": 0,
  "creator_id": "user-uuid-123",
  "created_at": "2024-03-10T10:00:00Z"
}
```

### Update Task

**Request Body:**

```json
{
  "action": "update",
  "id": "task-uuid-101",
  "updates": {
    "title": "Implement OAuth Login",
    "description": "Add Google and GitHub login support"
  }
}
```

**Response:**

```json
{
  "success": true
}
```

### Delete Task

**Request Body:**

```json
{
  "action": "delete",
  "id": "task-uuid-101"
}
```

**Response:**

```json
{
  "success": true
}
```

### Reorder Tasks (Batch)

**Request Body:**

```json
{
  "action": "reorder",
  "tasks": [
    {
      "id": "task-uuid-101",
      "column_id": "col-uuid-001",
      "position": 1
    },
    {
      "id": "task-uuid-102",
      "column_id": "col-uuid-001",
      "position": 0
    }
  ]
}
```

**Response:**

```json
{
  "success": true
}
```

---

## 5. Card Interactions (Comments & Relationships)

Manage comments and task dependencies.

*   **Endpoint:** `/card-interactions`
*   **Method:** `POST`

### Get Comments

**Request Body:**

```json
{
  "action": "get_comments",
  "taskId": "task-uuid-101"
}
```

**Response:**

```json
[
  {
    "id": "comment-uuid-500",
    "task_id": "task-uuid-101",
    "user_id": "user-uuid-123",
    "content": "This needs to be done by Friday.",
    "created_at": "2024-03-10T11:00:00Z",
    "profiles": {
      "full_name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  }
]
```

### Add Comment

**Request Body:**

```json
{
  "action": "add_comment",
  "taskId": "task-uuid-101",
  "content": "Adding unit tests for this feature."
}
```

**Response:**

```json
{
  "id": "comment-uuid-501",
  "task_id": "task-uuid-101",
  "content": "Adding unit tests for this feature.",
  "profiles": {
      "full_name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg"
  }
}
```

### Delete Comment

**Request Body:**

```json
{
  "action": "delete_comment",
  "id": "comment-uuid-501"
}
```

**Response:**

```json
{
  "success": true
}
```

### Get Task Relationships

**Request Body:**

```json
{
  "action": "get_relationships",
  "taskId": "task-uuid-101"
}
```

**Response:**

```json
[
  {
    "id": "rel-uuid-800",
    "source_task_id": "task-uuid-101",
    "target_task_id": "task-uuid-105",
    "type": "blocks",
    "related_task_title": "Setup Database Schema",
    "direction": "outgoing"
  }
]
```

### Add Relationship (Dependency)

**Request Body:**

```json
{
  "action": "add_relationship",
  "taskId": "task-uuid-101",
  "targetId": "task-uuid-105",
  "type": "blocks"
}
```

**Response:**

```json
{
  "success": true
}
```

### Search Tasks (for linking)

**Request Body:**

```json
{
  "action": "search_tasks",
  "query": "login",
  "excludeId": "task-uuid-101"
}
```

**Response:**

```json
[
  {
    "id": "task-uuid-200",
    "title": "Fix Login Bug"
  }
]
```

---

## 6. Notifications (Handle Task Update)

Trigger manual notifications (server-side mostly, but exposed).

*   **Endpoint:** `/handle-task-update`
*   **Method:** `POST`

**Request Body:**

```json
{
  "taskId": "task-uuid-101",
  "userId": "user-uuid-123",
  "type": "assignment",
  "message": "You have been assigned to 'Implement Login Screen'"
}
```

**Response:**

```json
{
  "success": true
}
```

