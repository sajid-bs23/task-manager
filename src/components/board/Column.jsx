import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks } from '../../hooks/useTasks'
import Task from './Task'
import TaskModal from './TaskModal'
import { Plus, GripVertical } from 'lucide-react'

export default function Column({ column, boardId }) {
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const { tasks, loading, createTask } = useTasks(column.id)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleCreateTask = async () => {
    const title = prompt('Enter task title:')
    if (title) {
      await createTask(column.id, title)
    }
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="min-w-[280px] bg-white rounded-lg border border-gray-200 flex flex-col shadow-sm"
      >
        {/* Column Header */}
        <div
          {...attributes}
          {...listeners}
          className="px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-grab active:cursor-grabbing flex items-center justify-between"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">{column.title}</h3>
          </div>
          <span className="ml-2 px-2 py-0.5 bg-gray-200 text-xs font-medium text-gray-600 rounded-full flex-shrink-0">
            {tasks.length}
          </span>
        </div>

        {/* Tasks Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-xs">No tasks</p>
            </div>
          ) : (
            tasks.map((task) => (
              <Task
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
              />
            ))
          )}
        </div>

        {/* Add Task Button */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleCreateTask}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add task
          </button>
        </div>
      </div>

      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => {
            setShowTaskModal(false)
            setSelectedTask(null)
          }}
        />
      )}
    </>
  )
}
