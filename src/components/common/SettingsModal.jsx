import { useState, useEffect } from 'react'
import { X, User, Lock, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function SettingsModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'password'
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    // Profile State
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')

    // Password State
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    useEffect(() => {
        if (isOpen) {
            fetchProfile()
            setMessage({ type: '', text: '' })
            setNewPassword('')
            setConfirmPassword('')
        }
    }, [isOpen])

    const fetchProfile = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.functions.invoke('profile-settings', {
                method: 'GET'
            })
            if (error) throw error
            setFullName(data.full_name || '')
            setEmail(data.email || '')
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage({ type: '', text: '' })
        try {
            const { error } = await supabase.functions.invoke('profile-settings', {
                method: 'POST',
                body: { fullName }
            })
            if (error) throw error
            setMessage({ type: 'success', text: 'Profile updated successfully!' })
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to update profile' })
        } finally {
            setLoading(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' })
            return
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
            return
        }

        setLoading(true)
        setMessage({ type: '', text: '' })
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) throw error
            setMessage({ type: 'success', text: 'Password updated successfully!' })
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to update password' })
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Account Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'password' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Password
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {message.text && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'profile' ? (
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 cursor-not-allowed">
                                    <User size={18} />
                                    <span className="text-sm">{email || 'Loading...'}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                        placeholder="Your full name"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Save Changes
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                        placeholder="New password"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Update Password
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
