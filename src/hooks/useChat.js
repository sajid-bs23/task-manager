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

    // Realtime subscription for Messages
    useEffect(() => {
        if (!activeConversation) return

        // Subscribe to new messages in the active conversation
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
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [activeConversation])

    const fetchConversations = async () => {
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
        setActiveConversation,
        fetchConversations,
        startChat,
        fetchMessages,
        sendMessage
    }
}
