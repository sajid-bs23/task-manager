import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoards } from '../hooks/useBoards'
import { Plus, X, Clock, Star } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const { boards, loading, createBoard } = useBoards()
  const [showModal, setShowModal] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    const { error } = await createBoard(title, description)
    setCreating(false)

    if (!error) {
      setShowModal(false)
      setTitle('')
      setDescription('')
    } else {
      alert('Failed to create board')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-8 h-full bg-gray-50/50">
      <div className="max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="flex items-center gap-2 mb-6">
          <Clock className="text-gray-400" size={24} />
          <h2 className="text-xl font-bold text-gray-700">Your Boards</h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

          {/* Create New Board Card */}
          <button
            onClick={() => setShowModal(true)}
            className="group h-32 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-500 bg-gray-50 hover:bg-purple-50 flex flex-col items-center justify-center transition-all duration-300"
          >
            <div className="h-10 w-10 rounded-full bg-gray-200 group-hover:bg-purple-100 flex items-center justify-center mb-2 transition-colors">
              <Plus className="text-gray-500 group-hover:text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-500 group-hover:text-purple-700">Create New Board</span>
          </button>

          {/* Existing Boards */}
          {boards.map((board) => (
            <div
              key={board.id}
              onClick={() => navigate(`/board/${board.id}`)}
              className="group h-32 rounded-xl bg-gradient-to-br from-cyan-400 via-purple-600 to-pink-500 p-4 relative cursor-pointer shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>

              <h3 className="text-white font-bold text-lg relative z-10">{board.title}</h3>
              {board.description && (
                <p className="text-white/80 text-xs mt-1 relative z-10 line-clamp-2">{board.description}</p>
              )}

              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                <Star className="text-white fill-white" size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800">Create Board</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Board Title</label>
                <input
                  autoFocus
                  type="text"
                  className="w-full border border-gray-300 bg-gray-50 rounded-lg xs:text-sm p-3 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  placeholder="e.g. Project Launch"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                <textarea
                  className="w-full border border-gray-300 bg-gray-50 rounded-lg text-sm p-3 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none outline-none"
                  placeholder="What's this board about?"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg shadow-purple-200 hover:shadow-xl hover:opacity-90 transition-all disabled:opacity-70"
                >
                  {creating ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
