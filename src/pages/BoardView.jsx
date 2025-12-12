import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBoardData } from '../hooks/useBoardData'
import { Plus, GripVertical, MoreHorizontal, X } from 'lucide-react'

// --- Components ---

function SortableColumn({ column }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'COLUMN', column }
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
        className="w-72 h-full bg-gray-100 rounded-xl opacity-30 border-2 border-dashed border-gray-400 flex-shrink-0"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-72 h-full bg-gray-100 rounded-xl flex flex-col max-h-full flex-shrink-0 shadow-sm border border-gray-200"
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className="p-3 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-gray-200/50 hover:bg-gray-200/50 transition-colors rounded-t-xl"
      >
        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide px-2">{column.title}</h3>
        <button className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-300/50">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Task List (Placeholder) */}
      <div className="flex-1 p-2 overflow-y-auto min-h-20">
        <div className="text-xs text-gray-400 text-center mt-4">No tasks yet</div>
      </div>

      {/* Footer */}
      <div className="p-3 pt-0">
        <button className="w-full py-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 text-sm font-medium text-left px-2 flex items-center gap-2 transition-colors">
          <Plus size={16} /> Add a card
        </button>
      </div>
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
  const { board, columns, loading, createColumn, updateColumnOrder } = useBoardData(boardId)
  const [activeColumn, setActiveColumn] = useState(null)

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
    }
  }

  const onDragEnd = (event) => {
    setActiveColumn(null)
    const { active, over } = event

    if (!over) return

    if (active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id)
      const newIndex = columns.findIndex((col) => col.id === over.id)

      const newColumns = arrayMove(columns, oldIndex, newIndex)
      updateColumnOrder(newColumns)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!board) return <div className="p-8">Board not found</div>

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="h-full flex flex-col bg-purple-500/10" style={{ backgroundImage: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)' }}>
        {/* Board Header */}
        <div className="h-14 bg-white/50 backdrop-blur-sm px-6 flex items-center border-b border-gray-200">
          <h1 className="font-bold text-gray-800 text-lg">{board.title}</h1>
          {board.description && <span className="ml-4 text-sm text-gray-500 border-l border-gray-300 pl-4 py-1">{board.description}</span>}
        </div>

        {/* Board Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex h-full gap-6">

            <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map(column => (
                <SortableColumn key={column.id} column={column} />
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
        </DragOverlay>
      </div>
    </DndContext>
  )
}


