import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Users, ChevronLeft } from 'lucide-react'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../hooks/useAuth'

export default function ChatWidget({ boardId, members }) {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [view, setView] = useState('list') // 'list' | 'chat'

    // Hook
    // Note: passing [user] as logic, assumes useChat handles it
    const {
        conversations,
        activeConversation,
        messages,
        unreadCount,
        setActiveConversation,
        fetchConversations,
        fetchMessages,
        sendMessage,
        startChat
    } = useChat(boardId, user)

    const [msgInput, setMsgInput] = useState('')
    const bottomRef = useRef(null)

    // Load convos on open
    useEffect(() => {
        if (isOpen) {
            fetchConversations()
        }
    }, [isOpen])

    // Load messages when active conversation changes
    useEffect(() => {
        if (activeConversation) {
            fetchMessages(activeConversation.id)
            setView('chat')
        }
    }, [activeConversation])

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, view])

    const [selectedForGroup, setSelectedForGroup] = useState([])
    const [isGroupMode, setIsGroupMode] = useState(false)
    const [groupName, setGroupName] = useState('')

    const handleUserSelect = async (memberId) => {
        if (isGroupMode) {
            if (selectedForGroup.includes(memberId)) {
                setSelectedForGroup(prev => prev.filter(id => id !== memberId))
            } else {
                setSelectedForGroup(prev => [...prev, memberId])
            }
            return
        }

        // Start 1-on-1
        const convId = await startChat([memberId])
        if (convId) {
            setActiveConversation({ id: convId }) // Ideally fetch full obj
        }
    }

    const handleSend = async () => {
        if (!msgInput.trim()) return
        await sendMessage(activeConversation.id, msgInput)
        setMsgInput('')
    }

    const handleCreateGroup = async () => {
        if (selectedForGroup.length === 0 || !groupName.trim()) return

        const convId = await startChat(selectedForGroup, true, groupName)
        if (convId) {
            setActiveConversation({ id: convId })
            setIsGroupMode(false)
            setSelectedForGroup([])
            setGroupName('')
        }
    }

    if (!user) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white pointer-events-auto rounded-2xl shadow-2xl border border-gray-200 w-80 h-96 mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">

                    {/* Header */}
                    <div className="bg-purple-600 p-4 flex items-center justify-between text-white shrink-0">
                        <div className="flex items-center gap-2">
                            {view === 'chat' && (
                                <button onClick={() => setView('list')} className="hover:bg-purple-700 p-1 rounded-full">
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            <span className="font-bold">
                                {view === 'chat' ? (activeConversation?.name || 'Chat') : (isGroupMode ? 'New Group' : 'Team Chat')}
                            </span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-purple-700 p-1 rounded-full">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">

                        {/* User List & Recent Chats */}
                        {view === 'list' && (
                            <div className="p-2 space-y-2">

                                {/* Group Mode Toggle */}
                                {!isGroupMode ? (
                                    <button
                                        onClick={() => setIsGroupMode(true)}
                                        className="w-full py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 mb-2"
                                    >
                                        + Create Group Chat
                                    </button>
                                ) : (
                                    <div className="p-2 bg-purple-50 rounded-lg mb-2">
                                        <input
                                            className="w-full text-sm p-1 border rounded mb-2"
                                            placeholder="Group Name"
                                            value={groupName}
                                            onChange={e => setGroupName(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleCreateGroup} className="flex-1 bg-purple-600 text-white text-xs py-1 rounded">Create</button>
                                            <button onClick={() => setIsGroupMode(false)} className="flex-1 bg-gray-200 text-gray-600 text-xs py-1 rounded">Cancel</button>
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs font-semibold text-gray-500 px-2 mt-2 uppercase">
                                    {isGroupMode ? 'Select Members' : 'Board Members'}
                                </div>

                                {members.filter(m => m.user_id !== user.id).map(member => {
                                    const isSelected = selectedForGroup.includes(member.user_id)
                                    return (
                                        <div
                                            key={member.user_id}
                                            onClick={() => handleUserSelect(member.user_id)}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-purple-100 border border-purple-200' : 'hover:bg-white hover:shadow-sm'}`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold">
                                                {member.profiles?.full_name?.[0]}
                                            </div>
                                            <div className="text-sm font-medium text-gray-700">
                                                {member.profiles?.full_name}
                                            </div>
                                            {isGroupMode && isSelected && <Users size={14} className="ml-auto text-purple-600" />}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Messages */}
                        {view === 'chat' && (
                            <div className="flex-1 p-4 space-y-3">
                                {messages.map(msg => {
                                    const isMe = msg.sender_id === user.id
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-2 rounded-lg text-sm ${isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={bottomRef} />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    {view === 'chat' && (
                        <div className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
                            <input
                                className="flex-1 text-sm outline-none px-2"
                                placeholder="Type a message..."
                                value={msgInput}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                onChange={e => setMsgInput(e.target.value)}
                            />
                            <button onClick={handleSend} className="text-purple-600 hover:bg-purple-50 p-2 rounded-full">
                                <Send size={18} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 relative"
            >
                <MessageCircle size={24} />
                {unreadCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    )
}
