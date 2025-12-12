import { useState, useEffect } from 'react'
import { X, Paperclip, MessageSquare, Clock, User, Trash2, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  uploadTaskAttachment,
  deleteTaskAttachment,
  getTaskAttachments,
  getAttachmentUrl,
  addTaskComment,
  getTaskComments,
  deleteTaskComment,
  addTimeLog,
  getTimeLogs,
  deleteTimeLog,
  getBoardMembers,
} from '../../lib/api'
import { format } from 'date-fns'

export default function TaskModal({ task, onClose }) {
  const { user } = useAuth()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [attachments, setAttachments] = useState([])
  const [comments, setComments] = useState([])
  const [timeLogs, setTimeLogs] = useState([])
  const [assignee, setAssignee] = useState(task.assignee)
  const [boardMembers, setBoardMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [timeHours, setTimeHours] = useState('')
  const [timeDescription, setTimeDescription] = useState('')

  useEffect(() => {
    loadTaskData()
    subscribeToUpdates()
  }, [task.id])

  const loadTaskData = async () => {
    // Load attachments
    const { data: atts } = await getTaskAttachments(task.id)
    setAttachments(atts || [])

    // Load comments
    const { data: comms } = await getTaskComments(task.id)
    setComments(comms || [])

    // Load time logs
    const { data: logs } = await getTimeLogs(task.id)
    setTimeLogs(logs || [])

    // Load board members for assignee selection
    // First get the column to find the board_id
    const { data: column } = await supabase
      .from('columns')
      .select('board_id')
      .eq('id', task.column_id)
      .single()

    if (column?.board_id) {
      const { data: members } = await getBoardMembers(column.board_id)
      if (members) {
        setBoardMembers(members.map(m => m.profiles).filter(Boolean))
      }
    }
  }

  const subscribeToUpdates = () => {
    // Subscribe to task updates
    const taskChannel = supabase
      .channel(`task-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${task.id}`,
        },
        (payload) => {
          setTitle(payload.new.title)
          setDescription(payload.new.description || '')
          if (payload.new.assignee_id) {
            // Fetch assignee
            supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.assignee_id)
              .single()
              .then(({ data }) => setAssignee(data))
          } else {
            setAssignee(null)
          }
        }
      )
      .subscribe()

    // Subscribe to comments
    const commentsChannel = supabase
      .channel(`task-comments-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${task.id}`,
        },
        () => {
          getTaskComments(task.id).then(({ data }) => setComments(data || []))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(taskChannel)
      supabase.removeChannel(commentsChannel)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await supabase
        .from('tasks')
        .update({
          title,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (attachments.length >= 3) {
      alert('Maximum 3 attachments allowed')
      return
    }

    try {
      const { data, error } = await uploadTaskAttachment(task.id, file)
      if (error) throw error
      setAttachments([...attachments, data])
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    }
  }

  const handleDeleteAttachment = async (attachmentId, filePath) => {
    if (!confirm('Delete this attachment?')) return

    try {
      const { error } = await deleteTaskAttachment(attachmentId, filePath)
      if (error) throw error
      setAttachments(attachments.filter(a => a.id !== attachmentId))
    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert('Failed to delete attachment')
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const { data, error } = await addTaskComment(
        task.id,
        user.id,
        newComment,
        replyingTo
      )
      if (error) throw error
      setNewComment('')
      setReplyingTo(null)
      const { data: updatedComments } = await getTaskComments(task.id)
      setComments(updatedComments || [])
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleAddTimeLog = async () => {
    const hours = parseFloat(timeHours)
    if (!hours || hours <= 0) {
      alert('Please enter valid hours')
      return
    }

    try {
      const { error } = await addTimeLog(
        task.id,
        user.id,
        hours,
        timeDescription || null
      )
      if (error) throw error
      setTimeHours('')
      setTimeDescription('')
      const { data: updatedLogs } = await getTimeLogs(task.id)
      setTimeLogs(updatedLogs || [])
    } catch (error) {
      console.error('Error adding time log:', error)
    }
  }

  const handleAssignTask = async (userId) => {
    try {
      await supabase
        .from('tasks')
        .update({
          assignee_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setAssignee(data)
    } catch (error) {
      console.error('Error assigning task:', error)
    }
  }

  const renderComments = (parentId = null, level = 0) => {
    return comments
      .filter(comment => {
        if (parentId === null) return !comment.parent_comment_id
        return comment.parent_comment_id === parentId
      })
      .map(comment => (
        <div key={comment.id} className={`${level > 0 ? 'ml-8 mt-2' : ''}`}>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                  {comment.profiles?.full_name?.[0] || 'U'}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {comment.profiles?.full_name || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
              {comment.user_id === user?.id && (
                <button
                  onClick={() => {
                    deleteTaskComment(comment.id).then(() => {
                      getTaskComments(task.id).then(({ data }) => setComments(data || []))
                    })
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-700">{comment.content}</p>
            {level === 0 && (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                Reply
              </button>
            )}
          </div>
          {renderComments(comment.id, level + 1)}
        </div>
      ))
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            className="text-xl font-semibold flex-1 border-none outline-none text-gray-900"
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'comments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Comments
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'time'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Time Logs
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleSave}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a description..."
                />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignee
                </label>
                <div className="relative">
                  <select
                    value={assignee?.id || ''}
                    onChange={(e) => handleAssignTask(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {boardMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments ({attachments.length}/3)
                </label>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <a
                          href={getAttachmentUrl(attachment.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {attachment.file_name}
                        </a>
                      </div>
                      <button
                        onClick={() => handleDeleteAttachment(attachment.id, attachment.file_path)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {attachments.length < 3 && (
                    <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-500">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Add attachment</span>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-4">
                {renderComments()}
              </div>
              <div className="mt-6">
                {replyingTo && (
                  <div className="mb-2 text-sm text-gray-600">
                    Replying to comment...
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="ml-2 text-blue-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder={replyingTo ? "Reply to comment..." : "Add a comment..."}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'time' && (
            <div className="space-y-4">
              <div className="space-y-2">
                {timeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {log.profiles?.full_name || 'Unknown'} - {log.hours} hours
                      </div>
                      {log.description && (
                        <div className="text-xs text-gray-600 mt-1">{log.description}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    {log.user_id === user?.id && (
                      <button
                        onClick={() => {
                          deleteTimeLog(log.id).then(() => {
                            getTimeLogs(task.id).then(({ data }) => setTimeLogs(data || []))
                          })
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 border border-gray-300 rounded-md">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={timeHours}
                      onChange={(e) => setTimeHours(e.target.value)}
                      placeholder="0.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={timeDescription}
                      onChange={(e) => setTimeDescription(e.target.value)}
                      placeholder="What did you work on?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleAddTimeLog}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Time Log
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

