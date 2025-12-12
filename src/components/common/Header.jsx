import { useAuth } from '../../hooks/useAuth'

export default function Header() {
  const { user } = useAuth()

  return (
    <header className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
      <div className="font-semibold text-lg text-gray-800">Dashboard</div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-gray-800">Welcome Back</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-red-500 shadow-md border-2 border-white"></div>
      </div>
    </header>
  )
}
