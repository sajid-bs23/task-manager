import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { User, GripVertical } from 'lucide-react'

export default function Task({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <div
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-0.5 hover:bg-gray-100 rounded transition-opacity flex-shrink-0"
          >
            <GripVertical className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 flex-1">{task.title}</h4>
        </div>
        {task.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2 ml-5">{task.description}</p>
        )}
        {task.assignee && (
          <div className="flex items-center gap-1.5 mt-2 ml-5">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs text-gray-600">
              {task.assignee.full_name || task.assignee.email}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
