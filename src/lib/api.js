import { supabase } from './supabase'

// File Upload Implementation
export async function uploadTaskAttachment(taskId, file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `${taskId}/${fileName}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('task-attachments')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // Save metadata to database
  const { data, error } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
    })
    .select()
    .single()

  return { data, error }
}

export async function deleteTaskAttachment(attachmentId, filePath) {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('task-attachments')
    .remove([filePath])

  if (storageError) throw storageError

  // Delete from database
  const { error } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId)

  return { error }
}

export async function getTaskAttachments(taskId) {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function getAttachmentUrl(filePath) {
  const { data } = await supabase.storage
    .from('task-attachments')
    .getPublicUrl(filePath)

  return data?.publicUrl
}

// Board Member Management
export async function addBoardMember(boardId, userEmail) {
  // Find user by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', userEmail)
    .single()

  if (profileError || !profile) {
    throw new Error('User not found')
  }

  // Add to board_members
  const { data, error } = await supabase
    .from('board_members')
    .insert({
      board_id: boardId,
      user_id: profile.id,
      role: 'member',
    })
    .select()
    .single()

  return { data, error }
}

export async function removeBoardMember(boardId, userId) {
  const { error } = await supabase
    .from('board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('user_id', userId)

  return { error }
}

export async function getBoardMembers(boardId) {
  const { data, error } = await supabase
    .from('board_members')
    .select(`
      *,
      profiles (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('board_id', boardId)

  return { data, error }
}

// Task Comments
export async function addTaskComment(taskId, userId, content, parentCommentId = null) {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: userId,
      content,
      parent_comment_id: parentCommentId,
    })
    .select(`
      *,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `)
    .single()

  return { data, error }
}

export async function getTaskComments(taskId) {
  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  return { data, error }
}

export async function updateTaskComment(commentId, content) {
  const { data, error } = await supabase
    .from('task_comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select()
    .single()

  return { data, error }
}

export async function deleteTaskComment(commentId) {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)

  return { error }
}

// Time Logs
export async function addTimeLog(taskId, userId, hours, description = null) {
  const { data, error } = await supabase
    .from('time_logs')
    .insert({
      task_id: taskId,
      user_id: userId,
      hours,
      description,
    })
    .select(`
      *,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `)
    .single()

  return { data, error }
}

export async function getTimeLogs(taskId) {
  const { data, error } = await supabase
    .from('time_logs')
    .select(`
      *,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function deleteTimeLog(logId) {
  const { error } = await supabase
    .from('time_logs')
    .delete()
    .eq('id', logId)

  return { error }
}

