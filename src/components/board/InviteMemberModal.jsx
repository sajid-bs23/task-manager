import { useState } from 'react'
import { X, UserPlus, Loader2, Trash2 } from 'lucide-react'

export default function InviteMemberModal({ isOpen, onClose, members, onInvite, onRemove, isOwner }) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleInvite = async (e) => {
        e.preventDefault()
        if (!email.trim()) return

        setLoading(true)
        setError('')
        const { error } = await onInvite(email)
        setLoading(false)

        if (error) {
            setError(error.message || 'Failed to invite user')
        } else {
            setEmail('')
            // Optional: Close or keep open to invite more? user preference.
            // Let's keep open and show success? simplest is just clear email.
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Manage Members</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Invite Form */}
                    <form onSubmit={handleInvite} className="mb-8">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Invite by Email</label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="user@example.com"
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-70 transition-colors flex items-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                Invite
                            </button>
                        </div>
                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                    </form>

                    {/* Member List */}
                    <div>
                        <h3 className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Current Members ({members.length})</h3>
                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                                            {member.profiles?.full_name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{member.profiles?.full_name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">{member.profiles?.email}</p>
                                        </div>
                                    </div>
                                    {isOwner && member.role !== 'owner' && (
                                        <button
                                            onClick={() => onRemove(member.user_id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Member"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    {member.role === 'owner' && (
                                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">Owner</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
