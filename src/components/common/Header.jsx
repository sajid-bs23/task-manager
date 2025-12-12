import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import ProfileMenu from './ProfileMenu'
import SettingsModal from './SettingsModal'
import { supabase } from '../../lib/supabase'

export default function Header() {
  const { user } = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [profileName, setProfileName] = useState('')

  // Fetch real name for the header greeting
  useEffect(() => {
    async function getProfile() {
      if (user) {
        // Optimization: We could use the profile-settings function, but maybe redundant call if not open
        // Let's just do a quick fetch or wait for the menu to load it?
        // User wants to see name in header? "Welcome Back" -> "Welcome Back, Name"

        const { data } = await supabase.functions.invoke('profile-settings', { method: 'GET' })
        if (data?.full_name) setProfileName(data.full_name)
      }
    }
    getProfile()
  }, [user, isSettingsOpen]) // Refresh if settings closed (name might have changed)

  return (
    <>
      <header className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="font-semibold text-lg text-gray-800">Dashboard</div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800">
              {profileName ? `Welcome Back, ${profileName}` : 'Welcome Back'}
            </p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>

          <ProfileMenu
            user={{ ...user, user_metadata: { ...user?.user_metadata, full_name: profileName } }}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  )
}
