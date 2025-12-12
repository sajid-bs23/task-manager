import { useState, useRef, useEffect } from 'react'
import { LogOut, Settings, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function ProfileMenu({ user, onOpenSettings }) {
    const [isOpen, setIsOpen] = useState(false)
    const { signOut } = useAuth()
    const menuRef = useRef(null)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const handleLogout = () => {
        signOut()
        setIsOpen(false)
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-red-500 shadow-md border-2 border-white hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center justify-center text-white font-bold"
            >
                {user?.email?.[0].toUpperCase()}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800 truncate">{user?.user_metadata?.full_name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    <button
                        onClick={() => {
                            setIsOpen(false)
                            onOpenSettings()
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                        <Settings size={16} />
                        Settings
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            )}
        </div>
    )
}
