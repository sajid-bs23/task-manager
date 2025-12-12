import { Link } from 'react-router-dom'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col shadow-sm z-10 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 shadow-md"></div>
          <span className="font-bold text-xl text-gray-800 tracking-tight">TrelloClone</span>
        </div>

        <Link to="/" className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors mb-6">
          <span className="text-xl">+</span> Create Board
        </Link>

        <nav className="space-y-1">
          <Link to="/" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-white text-purple-700 font-medium border-l-4 border-purple-600 shadow-sm">
            <LayoutDashboard size={20} />
            <span>Boards</span>
          </Link>
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-gray-100">
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-gray-700 hover:text-red-600 w-full"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
