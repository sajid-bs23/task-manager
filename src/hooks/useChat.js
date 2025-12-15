import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useChat(boardId, currentUser) {
    const [conversations, setConversations] = useState([])
    const [activeConversation, setActiveConversation] = useState(null)
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)

    // Fetch conversations for this board (or all for user? Requirement: "users of this board")
    // Let's fetch conversations where this user is a participant.
    // And also we need a list of potential users to chat with (Board Members).

    const [unreadCount, setUnreadCount] = useState(0)

    // Initial Load
    useEffect(() => {
        if (currentUser) {
            fetchConversations()
            fetchUnreadCount()
        }
    }, [currentUser])

    // Global Message Subscription for Notifications
    useEffect(() => {
        // Subscribe to ALL messages in public schema
        // We filter client-side because dynamic server-side filters are limited
        const channel = supabase.channel('global-chat-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const newMessage = payload.new

                    // Ignore my own messages
                    if (currentUser && newMessage.sender_id === currentUser.id) return

                    // Check if this message belongs to one of my conversations
                    // We need the latest 'conversations' state, so use functional update or ref if needed.
                    // To be safe, let's rely on the fact that 'conversations' is updated.
                    // Actually, a simpler check: If I am not currently viewing this conversation, increment.
                    // But we only want to increment for conversations I AM in.
                    // We can check if 'conversations' list contains this ID.

                    setConversations(currentConvs => {
                        const isMyConversation = currentConvs.some(c => c.id === newMessage.conversation_id)

                        if (isMyConversation) {
                            setActiveConversation(currentActive => {
                                // If I'm not in this chat, increment unread
                                if (currentActive?.id !== newMessage.conversation_id) {
                                    setUnreadCount(prev => prev + 1)
                                }
                                return currentActive
                            })
                        }
                        return currentConvs
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Active Chat Message Subscription
    useEffect(() => {
        if (!activeConversation) return

        // Mark read when opening/switching
        markAsRead(activeConversation.id)

        const channel = supabase.channel(`chat-${activeConversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${activeConversation.id}`
                },
                (payload) => {
                    setMessages(prev => [...prev, payload.new])
                    // If we receive a message in active chat, we are reading it technically.
                    // We could debounce markRead here.
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [activeConversation])

    const fetchUnreadCount = async () => {
        const { data, error } = await supabase.rpc('get_unread_count')
        if (!error && data !== null) {
            setUnreadCount(data)
        }
    }

    const markAsRead = async (conversationId) => {
        await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
        // Optionally decrement local unread count if we knew how many were in this specific active chat.
        // For accurate count, re-fetch.
        fetchUnreadCount()
    }

    const fetchConversations = async () => {
        if (!currentUser) return

        // Fetch conversations user is part of
        // This is a bit complex with just RLS, usually need a join.
        // For MVP, we can fetch 'conversation_participants' then 'conversations'.
        const { data: myConvs, error } = await supabase
            .from('conversation_participants')
            .select('conversation_id, conversations(*)')
            .eq('user_id', currentUser.id)

        if (error) {
            console.error('Error fetching conversations:', error)
            return
        }

        // Flatten structure
        const formatted = myConvs.map(item => item.conversations).filter(Boolean)
        setConversations(formatted)
    }

    const startChat = async (participantIds, isGroup = false, name = null) => {
        // Check if existing 1-on-1 exists (if not group)
        if (!isGroup && participantIds.length === 1) {
            // Check logic later, for now just create new or return existing via RPC
        }

        const { data, error } = await supabase.rpc('create_conversation', {
            p_board_id: boardId,
            p_participant_ids: [...new Set([currentUser.id, ...participantIds])],
            p_is_group: isGroup,
            p_name: name
        })

        if (error) {
            console.error('Error creating chat:', error)
            return null
        }

        // data is conversation UUID
        return data
    }

    const fetchMessages = async (conversationId) => {
        setLoading(true)
        const { data, error } = await supabase
            .from('messages')
            .select('*, profiles(full_name, avatar_url)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching messages:', error)
        } else {
            console.log(`Fetched ${data.length} messages for conv ${conversationId}`)
            setMessages(data)
        }
        setLoading(false)
    }

    const sendMessage = async (conversationId, content) => {
        if (!currentUser) return
        console.log('Sending message to', conversationId)
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: currentUser.id,
                content
            })
            .select()

        if (error) {
            console.error('Error sending message:', error)
        } else {
            console.log('Message sent successfully:', data)
        }
    }

    return {
        conversations,
        activeConversation,
        messages,
        loading,
        unreadCount,
        setActiveConversation,
        fetchConversations,
        startChat,
        fetchMessages,
        sendMessage
    }
}
