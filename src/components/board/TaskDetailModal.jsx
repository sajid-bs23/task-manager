import { useState, useEffect, useRef } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { formatDistanceToNow } from 'date-fns'
import { X, Send, Link as LinkIcon, Trash2, MessageSquare, Paperclip, FileText, Download, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function TaskDetailModal({
    task,
    isOpen,
    onClose,
    updateTask,
    members = [],
    columns = []
}) {
    if (!isOpen || !task) return null

    // Local state for description editing
    const [description, setDescription] = useState(task.description || '')
    const [isEditingDesc, setIsEditingDesc] = useState(false)

    // Local state for Title Editing
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editTitle, setEditTitle] = useState(task.title || '')

    // Sync title/desc when task changes
    useEffect(() => {
        if (!isEditingTitle) setEditTitle(task.title || '')
        if (!isEditingDesc) setDescription(task.description || '')
    }, [task])

    const columnName = columns.find(c => c.id === task.column_id)?.title || 'Unknown Column'

    // Comments
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')

    // Relationships
    const [relationships, setRelationships] = useState([])
    const [isAddingRel, setIsAddingRel] = useState(false)
    const [targetTaskSearch, setTargetTaskSearch] = useState('')
    const [searchResults, setSearchResults] = useState([])

    // Attachments
    const [attachments, setAttachments] = useState([])
    const attachmentsRef = useRef(attachments)
    useEffect(() => {
        attachmentsRef.current = attachments
    }, [attachments])

    const [uploadError, setUploadError] = useState(null)
    const [isUploading, setIsUploading] = useState(false)

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && task) {
            fetchDetails()

            // Realtime subscription for comments
            const channel = supabase.channel(`task-detail-${task.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` },
                    (payload) => {
                        // If it's an INSERT and we don't have it (or just re-fetch to be safe and get profile)
                        // Note: Our optimistic update might already have added it.
                        // We can just re-fetch comments.
                        if (payload.eventType === 'INSERT') {
                            // Delay slightly to ensure DB write propagated if needed (though event usually means committed)
                            // We need to fetch to get the Profile data joined.
                            fetchCommentsOnly()
                        } else if (payload.eventType === 'DELETE') {
                            setComments(prev => prev.filter(c => c.id !== payload.old.id))
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'task_relationships', filter: `source_task_id=eq.${task.id}` },
                    (payload) => { console.log('Rel Change (Source)', payload); fetchRelationshipsOnly() }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'task_relationships', filter: `target_task_id=eq.${task.id}` },
                    (payload) => { console.log('Rel Change (Target)', payload); fetchRelationshipsOnly() }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'task_attachments' },
                    (payload) => {
                        console.log('Attachment Change (Raw)', payload)
                        // Hande INSERT/UPDATE: Check new/old task_id
                        const relatedTaskId = payload.new?.task_id || payload.old?.task_id

                        // Handle DELETE without Replica Identity (fallback): Check if ID is in current list
                        const isRelevantDelete = payload.eventType === 'DELETE' && attachmentsRef.current.some(a => a.id === payload.old.id)

                        if ((relatedTaskId && relatedTaskId === task.id) || isRelevantDelete) {
                            console.log("Triggering fetchAttachmentsOnly")
                            fetchAttachmentsOnly()
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`TaskDetail Subscription Status: ${status}`)
                })

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [isOpen, task?.id])

    const fetchCommentsOnly = async () => {
        const { data: commentsData } = await supabase.functions.invoke('card-interactions', {
            body: { action: 'get_comments', taskId: task.id }
        })
        if (commentsData) {
            setComments(current => {
                // Simple merge to avoid overwriting optimistic updates if they match? 
                // Actually, replacing proper is better to get real IDs and Profiles.
                // But we want to avoid UI jumps. 
                // If we optimistically added a comment, it has an ID/Profile? 
                // The optimistic add in handleAddComment receives the 'data' from server, so it has ID/Profile.
                // So straightforward replacement is fine.
                return commentsData
            })
        }
    }

    const fetchRelationshipsOnly = async () => {
        const { data: relData } = await supabase.functions.invoke('card-interactions', {
            body: { action: 'get_relationships', taskId: task.id }
        })
        setRelationships(relData || [])
    }

    const fetchAttachmentsOnly = async () => {
        const { data, error } = await supabase
            .from('task_attachments')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: false })

        if (!error && data) {
            // Generate signed URLs for images
            const attachmentsWithUrls = await Promise.all(data.map(async (att) => {
                if (att.file_type.startsWith('image/')) {
                    try {
                        const { data: signedData, error: signedError } = await supabase.storage
                            .from('attachments')
                            .createSignedUrl(att.file_path, 3600) // 1 hour expiry
                        if (!signedError) {
                            return { ...att, preview_url: signedData.signedUrl }
                        }
                    } catch (e) {
                        console.error("Error creating signed URL", e)
                    }
                }
                return att
            }))
            setAttachments(attachmentsWithUrls)
        }
    }

    const fetchDetails = async () => {
        setLoading(true)
        try {
            await Promise.all([fetchCommentsOnly(), fetchRelationshipsOnly(), fetchAttachmentsOnly()])
        } catch (err) {
            console.error("Error fetching details", err)
        } finally {
            setLoading(false)
        }
    }

    const saveDescription = async () => {
        await updateTask(task.id, { description })
        setIsEditingDesc(false)
    }

    const handleAddComment = async () => {
        if (!newComment.trim()) return

        const { data, error } = await supabase.functions.invoke('card-interactions', {
            body: { action: 'add_comment', taskId: task.id, content: newComment }
        })

        if (!error && data) {
            setComments([...comments, data])
            setNewComment('')
        }
    }

    const handleDeleteComment = async (commentId) => {
        const { error } = await supabase.functions.invoke('card-interactions', {
            body: { action: 'delete_comment', id: commentId }
        })
        if (!error) {
            setComments(comments.filter(c => c.id !== commentId))
        }
    }

    const searchTasks = async (query) => {
        setTargetTaskSearch(query)
        // Ensure even empty query fetches results (latest tasks)
        const { data } = await supabase.functions.invoke('card-interactions', {
            body: { action: 'search_tasks', query, excludeId: task.id }
        })
        setSearchResults(data || [])
    }

    const addRelationship = async (targetId, type) => {
        const { error } = await supabase.functions.invoke('card-interactions', {
            body: { action: 'add_relationship', taskId: task.id, targetId, type }
        })

        if (!error) {
            fetchDetails() // Easy refresh
            setIsAddingRel(false)
            setTargetTaskSearch('')
        }
    }

    const removeRelationship = async (relId) => {
        const { error } = await supabase.functions.invoke('card-interactions', {
            body: { action: 'delete_relationship', id: relId }
        })
        if (!error) {
            setRelationships(relationships.filter(r => r.id !== relId))
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadError(null)

        // Validation 1: Max files
        if (attachments.length >= 3) {
            setUploadError("This card already has 3 attachments. Please remove one to add a new file.")
            e.target.value = null // reset input
            return
        }

        // Validation 2: Max size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setUploadError("File size exceeds 10MB limit.")
            e.target.value = null
            return
        }

        setIsUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${task.id}/${fileName}`

            // Upload to Storage
            const { error: uploadErr } = await supabase.storage
                .from('attachments')
                .upload(filePath, file)

            if (uploadErr) throw uploadErr

            // Insert to DB
            const { data: insertData, error: dbError } = await supabase
                .from('task_attachments')
                .insert({
                    task_id: task.id,
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type || 'application/octet-stream',
                    file_size: file.size
                })
                .select()
                .single()

            if (dbError) throw dbError

            let attachmentWithPreview = insertData
            if (insertData.file_type.startsWith('image/')) {
                const { data: signedData } = await supabase.storage
                    .from('attachments')
                    .createSignedUrl(filePath, 3600)
                if (signedData) {
                    attachmentWithPreview = { ...insertData, preview_url: signedData.signedUrl }
                }
            }

            setAttachments(prev => [attachmentWithPreview, ...prev])
            e.target.value = null // reset input
        } catch (error) {
            console.error('Upload failed:', error)
            setUploadError(error.message || "Failed to upload file")
        } finally {
            setIsUploading(false)
        }
    }

    const handleDeleteAttachment = async (attachment) => {
        try {
            console.log('Deleting attachment:', attachment.file_path)

            // Delete from Storage first
            const { error: storageErr } = await supabase.storage
                .from('attachments')
                .remove([attachment.file_path])

            if (storageErr) {
                console.error('Storage delete error:', storageErr)
                throw storageErr
            }
            console.log('Storage delete successful')

            // Delete from DB
            const { error: dbErr } = await supabase
                .from('task_attachments')
                .delete()
                .eq('id', attachment.id)

            if (dbErr) {
                console.error('Database delete error:', dbErr)
                throw dbErr
            }
            console.log('Database delete successful')

            setAttachments(attachments.filter(a => a.id !== attachment.id))
        } catch (error) {
            console.error("Delete failed:", error)
            alert(`Failed to delete attachment: ${error.message}`)
        }
    }

    const downloadAttachment = async (path, originalName) => {
        try {
            // Get signed URL for private bucket
            const { data, error } = await supabase.storage
                .from('attachments')
                .createSignedUrl(path, 60) // 60 seconds expiry

            if (error) throw error

            // Download using signed URL
            const response = await fetch(data.signedUrl)
            const blob = await response.blob()

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = originalName
            document.body.appendChild(a)
            a.click()
            URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error("Download failed:", error)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex overflow-hidden shadow-2xl">

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-y-auto p-8 scrollbar-thin">

                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            {isEditingTitle ? (
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault()
                                        if (editTitle.trim() && editTitle !== task.title) {
                                            await updateTask(task.id, { title: editTitle })
                                        } else {
                                            setEditTitle(task.title)
                                        }
                                        setIsEditingTitle(false)
                                    }}
                                    className="mb-2"
                                >
                                    <input
                                        autoFocus
                                        className="text-2xl font-bold text-gray-800 border-b-2 border-purple-500 outline-none w-full bg-transparent"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        onBlur={async () => {
                                            if (editTitle.trim() && editTitle !== task.title) {
                                                await updateTask(task.id, { title: editTitle })
                                            } else {
                                                setEditTitle(task.title)
                                            }
                                            setIsEditingTitle(false)
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setEditTitle(task.title)
                                                setIsEditingTitle(false)
                                            }
                                        }}
                                    />
                                </form>
                            ) : (
                                <h2
                                    className="text-2xl font-bold text-gray-800 mb-2 hover:bg-gray-50 cursor-text rounded px-1 -ml-1 transition-colors border border-transparent hover:border-gray-200"
                                    onDoubleClick={() => setIsEditingTitle(true)}
                                    title="Double-click to edit title"
                                >
                                    {task.title}
                                </h2>
                            )}
                            <div className="text-sm text-gray-500">In column <span className="font-semibold text-gray-700">{columnName}</span></div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Description */}
                    <div className="mb-8 group">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare size={18} className="text-gray-600" />
                            <h3 className="font-semibold text-gray-700">Description</h3>
                        </div>

                        {isEditingDesc ? (
                            <div className="mb-4">
                                <ReactQuill theme="snow" value={description} onChange={setDescription} className="mb-2 bg-white" />
                                <div className="flex gap-2 mt-2">
                                    <button onClick={saveDescription} className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700">Save</button>
                                    <button onClick={() => setIsEditingDesc(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsEditingDesc(true)}
                                className="prose prose-sm max-w-none min-h-20 p-3 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
                            >
                                {description ? (
                                    <div dangerouslySetInnerHTML={{ __html: description }} />
                                ) : (
                                    <span className="text-gray-400 italic">Add a more detailed description...</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Paperclip size={18} className="text-gray-600" />
                                <h3 className="font-semibold text-gray-700">Attachments</h3>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {attachments.length}/3
                                </span>
                            </div>
                        </div>

                        {uploadError && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                <AlertCircle size={16} />
                                {uploadError}
                            </div>
                        )}

                        <div className="space-y-3 mb-4">
                            {attachments.map(att => (
                                <div key={att.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                                            {att.preview_url ? (
                                                <img src={att.preview_url} alt={att.file_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <FileText size={20} className="text-gray-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-700 truncate cursor-pointer hover:text-purple-600 hover:underline" onClick={() => downloadAttachment(att.file_path, att.file_name)}>
                                                {att.file_name}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {(att.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(att.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => downloadAttachment(att.file_path, att.file_name)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                            title="Download"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAttachment(att)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {attachments.length < 3 ? (
                            <div>
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className={`w-full py-2 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-gray-500 transition-colors cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600'}`}
                                >
                                    {isUploading ? (
                                        <span>Uploading...</span>
                                    ) : (
                                        <>
                                            <Paperclip size={16} />
                                            <span>Add an attachment</span>
                                            <span className="text-xs font-normal text-gray-400 ml-1">(Max 10MB)</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        ) : (
                            <div className="text-xs text-center text-gray-400 bg-gray-50 p-2 rounded border border-gray-100 italic">
                                Attachment limit reached (3/3). Remove a file to upload a new one.
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare size={18} className="text-gray-600" />
                            <h3 className="font-semibold text-gray-700">Activity</h3>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                            <div className="flex gap-2">
                                <textarea
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-14" // Fixed height for now
                                />
                                <button
                                    disabled={!newComment.trim()}
                                    onClick={handleAddComment}
                                    className="px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {comments.map(comment => (
                                <div key={comment.id} className="flex gap-3 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0">
                                        {comment.profiles?.full_name?.[0] || 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="font-semibold text-gray-800 text-sm">{comment.profiles?.full_name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(comment.created_at))} ago</span>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm text-gray-700 shadow-sm relative group">
                                            {comment.content}
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="absolute right-2 top-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Sidebar */}
                <div className="w-80 bg-gray-50 border-l border-gray-100 p-6 flex flex-col gap-6 overflow-y-auto">

                    {/* Metadata */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Details</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between"><span>Created</span> <span>{new Date(task.created_at).toLocaleDateString()}</span></div>
                            <div className="flex justify-between items-center">
                                <span>Assignee</span>
                                <select
                                    className="bg-transparent border-none outline-none text-right cursor-pointer hover:text-purple-600 transition-colors bg-white/50 rounded px-1 -mr-1"
                                    value={task.assignee_id || ""}
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        // Find the member object to optimistically update (optional but good for UI)
                                        // updateTask handles the backend and local state merge in hook
                                        updateTask(task.id, { assignee_id: newVal || null })
                                    }}
                                >
                                    <option value="">Unassigned</option>
                                    {members && members.map(m => (
                                        <option key={m.id} value={m.user_id}>
                                            {m.profiles?.full_name || m.profiles?.email || 'Unknown User'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Relationships */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Links</h4>
                        <div className="space-y-2 mb-3">
                            {relationships.map(rel => (
                                <div key={rel.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 truncate">
                                        <LinkIcon size={12} className={rel.direction === 'outgoing' ? "text-blue-500" : "text-green-500"} />
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-700 truncate max-w-[120px]">{rel.related_task_title}</span>
                                            <span className="text-[10px] text-gray-400">{rel.type} ({rel.direction})</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeRelationship(rel.id)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>

                        {isAddingRel ? (
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-md">
                                <input
                                    autoFocus
                                    placeholder="Search tasks..."
                                    className="w-full text-sm p-1 border-b border-gray-200 outline-none mb-2"
                                    value={targetTaskSearch}
                                    onChange={e => searchTasks(e.target.value)}
                                />
                                {searchResults.length > 0 && (
                                    <div className="max-h-32 overflow-y-auto mb-2 border rounded">
                                        {searchResults.map(res => (
                                            <div
                                                key={res.id}
                                                className="text-xs p-1 hover:bg-purple-50 cursor-pointer"
                                                onClick={() => addRelationship(res.id, 'relates_to')}
                                            >
                                                {res.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button onClick={() => setIsAddingRel(false)} className="w-full text-xs text-center text-gray-400 hover:text-gray-600">Cancel</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    setIsAddingRel(true)
                                    searchTasks('')
                                }}
                                className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium text-gray-700 transition-colors"
                            >
                                + Add Link
                            </button>
                        )}
                    </div>

                </div>

            </div>
        </div>
    )
}
