import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Notifications from './Notifications'
import { LogOut, User } from 'lucide-react'

export default function Navbar() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link to="/" className="text-lg font-semibold text-gray-900">
              Task Manager
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <Notifications />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-gray-700 hidden sm:block">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
