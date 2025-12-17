import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Global set to track processed message IDs across all hook instances
const globalProcessedIds = new Set()

export function useChat(boardId, currentUser, isWidgetOpen = false) {
    const [conversations, setConversations] = useState([])
    const [activeConversation, setActiveConversation] = useState(null)
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)

    // Fetch conversations for this board (or all for user? Requirement: "users of this board")
    // Let's fetch conversations where this user is a participant.
    // And also we need a list of potential users to chat with (Board Members).

    const [unreadCount, setUnreadCount] = useState(0)

    // Refs to access latest state inside listeners without dependencies
    const isOpenRef = useRef(isWidgetOpen)
    const activeConversationRef = useRef(activeConversation)
    const conversationsRef = useRef(conversations)

    // Sync refs
    useEffect(() => {
        isOpenRef.current = isWidgetOpen
        if (isWidgetOpen && activeConversation) {
            markAsRead(activeConversation.id)
        }
    }, [isWidgetOpen, activeConversation])

    useEffect(() => {
        activeConversationRef.current = activeConversation
    }, [activeConversation])

    useEffect(() => {
        conversationsRef.current = conversations
    }, [conversations])

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
        const channel = supabase.channel('global-chat-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const newMessage = payload.new

                    // Global Deduplication check
                    if (globalProcessedIds.has(newMessage.id)) {

                        return
                    }
                    globalProcessedIds.add(newMessage.id)


                    // Cleanup old IDs periodically
                    if (globalProcessedIds.size > 500) {
                        globalProcessedIds.clear()
                    }

                    // Ignore my own messages
                    if (currentUser && newMessage.sender_id === currentUser.id) return

                    // Check if message belongs to one of my conversations (using Ref)
                    const myConvs = conversationsRef.current
                    const isMyConversation = myConvs.some(c => c.id === newMessage.conversation_id)

                    if (isMyConversation) {
                        // Check if we should increment unread count
                        // 1. Widget is CLOSED
                        // 2. Widget is OPEN but viewing DIFFERENT conversation
                        const isClosed = !isOpenRef.current
                        const currentActive = activeConversationRef.current
                        const distinctConv = currentActive?.id !== newMessage.conversation_id

                        if (isClosed || distinctConv) {

                            setUnreadCount(prev => prev + 1)
                        }
                    }
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

            setMessages(data)
        }
        setLoading(false)
    }

    const sendMessage = async (conversationId, content) => {
        if (!currentUser) return

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
