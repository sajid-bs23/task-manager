
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, MessageSquare, Link as LinkIcon, Calendar, UserPlus, X } from 'lucide-react'
import { useBoardData } from '../hooks/useBoardData'
import TaskDetailModal from '../components/board/TaskDetailModal'
import InviteMemberModal from '../components/board/InviteMemberModal'
import ChatWidget from '../components/chat/ChatWidget'

// --- Components ---

import { verticalListSortingStrategy } from '@dnd-kit/sortable'

function SortableTask({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'TASK', task }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-gray-50 p-3 rounded-lg border-2 border-dashed border-gray-300 opacity-50 h-20 mb-2"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-2 cursor-pointer active:cursor-grabbing hover:border-purple-300 group hover:shadow-md transition-all"
    >
      <div className="text-sm text-gray-800 font-medium">{task.title}</div>
      {/* Small indicators could go here (e.g. comment count) */}
    </div>
  )
}
function SortableColumn({ column, updateColumn, deleteColumn, createTask, onTaskClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'COLUMN', column }
  })

  // Local State
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(column.title)
  const [showMenu, setShowMenu] = useState(false)

  // Task Creation State
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const handleRename = async (e) => {
    e.preventDefault()
    if (editTitle.trim() && editTitle !== column.title) {
      await updateColumn(column.id, editTitle)
    }
    setIsEditing(false)
    setShowMenu(false)
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this column?')) {
      await deleteColumn(column.id)
    }
    setShowMenu(false)
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    await createTask(column.id, newTaskTitle)
    setNewTaskTitle('')
    setIsAddingTask(false)
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-72 h-full bg-gray-100 rounded-xl opacity-30 border-2 border-dashed border-gray-400 flex-shrink-0"
      />
    )
  }

  const tasks = column.tasks || []

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-72 h-full bg-gray-100 rounded-xl flex flex-col max-h-full flex-shrink-0 shadow-sm border border-gray-200 group relative"
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className="p-3 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-gray-200/50 hover:bg-gray-200/50 transition-colors rounded-t-xl"
      >
        {isEditing ? (
          <form onSubmit={handleRename} className="flex-1 mr-2">
            <input
              autoFocus
              className="w-full text-sm font-bold text-gray-700 bg-white border border-purple-400 rounded px-1 py-0.5 outline-none"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditing(false)
                e.stopPropagation() // Prevent dnd interference
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </form>
        ) : (
          <h3
            className="font-bold text-gray-700 text-sm uppercase tracking-wide px-2 truncate"
            onDoubleClick={() => setIsEditing(true)}
          >
            {column.title} <span className="text-gray-400 text-xs ml-2 font-normal">{tasks.length}</span>
          </h3>
        )}

        <div className="relative">
          <button
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-300/50"
            onClick={(e) => {
              e.stopPropagation() // Prevent drag start
              setShowMenu(!showMenu)
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={16} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 w-40 bg-white shadow-xl rounded-lg border border-gray-100 py-1 z-50">
              <button
                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <span>Rename</span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <span>Delete</span>
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button
                onClick={() => setShowMenu(false)}
                className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 p-2 overflow-y-auto min-h-20 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !isAddingTask && (
          <div className="text-xs text-gray-400 text-center mt-4">No cards yet</div>
        )}
      </div>

      {/* Footer / Add Card */}
      <div className="p-3 pt-0">
        {isAddingTask ? (
          <form onSubmit={handleAddTask} className="bg-white p-2 rounded-lg border border-purple-400 shadow-sm">
            <textarea
              autoFocus
              className="w-full text-sm outline-none resize-none mb-2"
              placeholder="Enter a title for this card..."
              rows={2}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddTask(e);
                }
                if (e.key === 'Escape') setIsAddingTask(false)
              }}
            />
            <div className="flex gap-2 items-center">
              <button type="submit" className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700">Add Card</button>
              <button type="button" onClick={() => setIsAddingTask(false)} className="text-gray-500 hover:text-gray-800"><X size={16} /></button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingTask(true)}
            className="w-full py-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 text-sm font-medium text-left px-2 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> Add a card
          </button>
        )}
      </div>

      {/* Click outside to close menu overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
      )}
    </div>
  )
}

function ColumnOverlay({ column }) {
  return (
    <div className="w-72 h-full bg-gray-100 rounded-xl flex flex-col shadow-2xl border-2 border-purple-500 cursor-grabbing opacity-90 rotate-2">
      <div className="p-3 flex items-center justify-between border-b border-gray-200/50 bg-gray-200/50 rounded-t-xl">
        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide px-2">{column.title}</h3>
        <MoreHorizontal size={16} className="text-gray-400" />
      </div>
      <div className="flex-1 p-2"></div>
    </div>
  )
}

// --- Main Page ---

export default function BoardView() {
  const { boardId } = useParams()
  const id = boardId // alias for consistency if needed, or just pass boardId

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  const {
    board,
    columns,
    loading,
    error: boardError,
    createColumn,
    updateColumnOrder,
    updateColumn,
    deleteColumn,
    createTask,
    updateTaskOrder,
    deleteTask,
    updateTask,
    members,
    inviteMember,
    removeMember
  } = useBoardData(boardId)

  const [activeColumn, setActiveColumn] = useState(null)

  // Task Details Modal
  const [selectedTask, setSelectedTask] = useState(null)

  // Sync selectedTask with active board data to ensure updates (e.g. description) are reflected immediately
  useEffect(() => {
    if (selectedTask && columns.length > 0) {
      for (const col of columns) {
        const found = col.tasks?.find(t => t.id === selectedTask.id)
        if (found && found !== selectedTask) {
          setSelectedTask(found)
          break
        }
      }
    }
  }, [columns, selectedTask])

  // Check if owner - simplified
  const isOwner = true

  // Create Column State
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require movement of 8px to start drag (prevents accidental drags on clicks)
      },
    })
  )

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColumnTitle.trim()) return
    await createColumn(newColumnTitle)
    setNewColumnTitle('')
    setIsAddingColumn(false)
  }

  const onDragStart = (event) => {
    if (event.active.data.current?.type === 'COLUMN') {
      setActiveColumn(event.active.data.current.column)
      return
    }
    if (event.active.data.current?.type === 'TASK') {
      // Set active task (Not strictly needed for logic but good for overlay)
      setActiveColumn(event.active.data.current.task) // Reuse state or add new one?
      // Actually let's use a separate state for task to avoid confusion
    }
  }

  // Need separate state for active task
  const [activeTask, setActiveTask] = useState(null)

  const handleDragStart = (event) => {
    if (event.active.data.current?.type === 'COLUMN') {
      setActiveColumn(event.active.data.current.column)
    } else if (event.active.data.current?.type === 'TASK') {
      setActiveTask(event.active.data.current.task)
    }
  }

  const onDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === 'TASK'
    const isOverTask = over.data.current?.type === 'TASK'
    const isOverColumn = over.data.current?.type === 'COLUMN'

    if (!isActiveTask) return;

    // Moving Task over Task
    if (isActiveTask && isOverTask) {
      const activeColumnId = columns.find(col => col.tasks.find(t => t.id === activeId))?.id
      const overColumnId = columns.find(col => col.tasks.find(t => t.id === overId))?.id

      if (!activeColumnId || !overColumnId) return

      if (activeColumnId !== overColumnId) {
        // Moving to different column (Visual update needs to happen here ideally for smooth DND)
        // But dnd-kit handles visual if we update items.
        // We need to return the new items state? No, BoardView doesn't own state locally in that way.
        // useBoardData manages state.
        // We might need to call a function to temporarily update state for smoothness?
        // Or rely on onDragEnd. onDragOver is crucial for cross-container sorting.

        // Strategy: We can't easily update state here without triggering rerenders.
        // But dnd-kit expects us to update the items if we want the "gap" to appear in the new list.
      }
    }

    // Moving Task over Empty Column
    if (isActiveTask && isOverColumn) {
      // Logic to move task to that column
    }
  }

  // Simplified DND Strategy for MVP:
  // Only handle reorder on DragEnd. 
  // NOTE: Cross-column drag often fails if we don't handle handling onDragOver to move the item to the new container.

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id
    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === 'TASK'
    const isOverTask = over.data.current?.type === 'TASK'

    if (!isActiveTask) return

    // Find the columns
    const activeColumn = columns.find(col => col.tasks.some(t => t.id === activeId))
    const overColumn = columns.find(col =>
      (isOverTask && col.tasks.some(t => t.id === overId)) ||
      (col.id === overId) // Is over a column
    )

    if (!activeColumn || !overColumn) return

    if (activeColumn.id !== overColumn.id) {
      // We need to simulate the move for UI smoothness
      // This requires `updateTaskOrder` to accept a temporary state update or `setColumns` to be exposed.
      // Since `updateTaskOrder` in useBoardData does `setColumns`, we can use it!

      const activeTasks = activeColumn.tasks
      const overTasks = overColumn.tasks
      const activeIndex = activeTasks.findIndex(t => t.id === activeId)
      const overIndex = isOverTask
        ? overTasks.findIndex(t => t.id === overId)
        : overTasks.length + 1 // End of column

      let newIndex
      if (isOverTask) {
        newIndex = overTasks.findIndex(t => t.id === overId)
        // If moving down, add 1? No dnd-kit sortable handles this usually via arrayMove calculation
        const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = newIndex >= 0 ? newIndex + modifier : overTasks.length + 1;
      } else {
        newIndex = overTasks.length + 1
      }

      // Wait, calling `updateTaskOrder` here might trigger backend usage which we don't want on DragOver.
      // We only want to update LOCAL state.
      // `updateTaskOrder` in hook does optimistic update AND fetches backend.
      // We should split it or just rely on DragEnd for the backend call.
      // Actually, dnd-kit recommends updating items during DragOver for different containers.
      // Let's create a local utility here to calculate new columns state and call `setColumns`.
      // BUT `setColumns` is hidden in the hook.

      // Plan B: Just handle DragEnd. Visuals might be clunky (item snaps back then moves).
      // Let's try to expose `setBoardData` or similar? No.

      // Let's modify `updateTaskOrder` to have a `skipBackend` flag?
      // Or just let it do its thing. Optimistic update is fast. 
      // But firing backend requests on every pixel move is BAD.

      // Okay, I will implement `onDragEnd` ONLY for now. If it's too janky, I'll refactor.
    }
  }

  const handleDragEnd = (event) => {
    setActiveColumn(null)
    setActiveTask(null)

    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveColumn = active.data.current?.type === 'COLUMN'
    if (isActiveColumn) {
      const oldIndex = columns.findIndex(c => c.id === activeId)
      const newIndex = columns.findIndex(c => c.id === overId)
      const newColumns = arrayMove(columns, oldIndex, newIndex)
      updateColumnOrder(newColumns)
      return
    }

    const isActiveTask = active.data.current?.type === 'TASK'
    if (isActiveTask) {
      // Find source and destination columns
      const sourceColumn = columns.find(col => col.tasks.some(t => t.id === activeId))
      const destColumn = columns.find(col =>
        (col.tasks.some(t => t.id === overId)) || (col.id === overId)
      )

      if (!sourceColumn || !destColumn) return

      const sourceTasks = [...sourceColumn.tasks]
      const destTasks = sourceColumn.id === destColumn.id ? sourceTasks : [...destColumn.tasks]

      const activeTask = sourceTasks.find(t => t.id === activeId)
      const activeIndex = sourceTasks.findIndex(t => t.id === activeId)

      let overIndex
      if (over.data.current?.type === 'TASK') {
        overIndex = destTasks.findIndex(t => t.id === overId)
      } else {
        // Dropped on a column, add to end
        overIndex = destTasks.length
      }

      let newSourceTasks, newDestTasks

      if (sourceColumn.id === destColumn.id) {
        // Same column reorder
        newSourceTasks = arrayMove(sourceTasks, activeIndex, overIndex)
        updateTaskOrder([{ columnId: sourceColumn.id, tasks: newSourceTasks }])
      } else {
        // Different column
        newSourceTasks = sourceTasks.filter(t => t.id !== activeId)

        // Insert into dest
        // If dropping on column, overIndex might be out of bounds, splice handles it?
        // "overIndex" needs to be correct.
        // If dropping on a TASK, overIndex is that task's index.
        // If dropping ON COLUMN, we want to append.

        // Adjust index if needed? arrayMove handles it well but here we are manually moving.

        newDestTasks = [...destTasks]
        newDestTasks.splice(overIndex, 0, activeTask)

        updateTaskOrder([
          { columnId: sourceColumn.id, tasks: newSourceTasks },
          { columnId: destColumn.id, tasks: newDestTasks }
        ])
      }
    }
  }

  // Define sensors (moved from above if needed, but they are defined at top so we are good)
  // Actually, handleDragEnd ends here.

  // Loading/Error states
  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  )

  if (boardError) return (
    <div className="flex-1 flex items-center justify-center text-red-600">
      Error loading board: {boardError.message}
    </div>
  )

  if (!board) return <div className="p-8">Board not found</div>


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">

        {/* Board Header */}
        <div className="px-8 py-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">{board.title}</h1>
            <p className="text-gray-500 text-sm max-w-xl truncate">{board.description || 'No description'}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Members List */}
            <div className="flex items-center -space-x-2">
              {members?.map(member => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shadow-sm"
                  title={member.profiles?.full_name}
                >
                  {member.profiles?.full_name?.[0] || 'U'}
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <UserPlus size={18} />
              <span>Invite</span>
            </button>
          </div>
        </div>   {/* Board Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex h-full gap-6">

            <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map(column => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  updateColumn={updateColumn}
                  deleteColumn={deleteColumn}
                  createTask={createTask}
                  onTaskClick={setSelectedTask}
                />
              ))}
            </SortableContext>

            {/* Add Column Button */}
            <div className="w-72 flex-shrink-0">
              {isAddingColumn ? (
                <div className="bg-gray-100 rounded-xl p-3 shadow-md">
                  <form onSubmit={handleAddColumn}>
                    <input
                      autoFocus
                      type="text"
                      className="w-full rounded-md border-gray-300 p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-2"
                      placeholder="Enter column title..."
                      value={newColumnTitle}
                      onChange={e => setNewColumnTitle(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700 transition-colors"
                      >
                        Add Column
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingColumn(false)}
                        className="px-3 py-1.5 text-gray-600 hover:bg-gray-300 rounded text-xs transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="w-full bg-white/40 hover:bg-white/60 backdrop-blur-sm rounded-xl py-3 text-gray-600 font-bold flex items-center justify-center gap-2 transition-all border-2 border-dashed border-gray-300 hover:border-purple-400 hover:text-purple-700 h-14"
                >
                  <Plus size={20} /> Add Column
                </button>
              )}
            </div>

          </div>
        </div>

        <DragOverlay>
          {activeColumn ? <ColumnOverlay column={activeColumn} /> : null}
          {activeTask ? <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-2 rotate-3 cursor-grabbing w-64"><div className="text-sm text-gray-800 font-medium">{activeTask.title}</div></div> : null}
        </DragOverlay>
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          updateTask={updateTask}
          members={members || []}
        />

        <InviteMemberModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          members={members || []}
          onInvite={inviteMember}
          onRemove={removeMember}
          isOwner={isOwner}
        />

        <ChatWidget boardId={board.id} members={members} />
      </div>
    </DndContext>
  )
}
