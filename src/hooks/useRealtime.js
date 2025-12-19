import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(table, filter = {}) {
  const [data, setData] = useState([])

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      let query = supabase.from(table).select('*')

      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      const { data: initialData } = await query
      setData(initialData || [])
    }

    fetchData()

    // Subscribe to changes
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: Object.entries(filter)
            .map(([key, value]) => `${key}=eq.${value}`)
            .join(','),
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => prev.map(item =>
              item.id === payload.new.id ? payload.new : item
            ))
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(item => item.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime (${table}) Status: ${status}`)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, JSON.stringify(filter)])

  return data
}

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!userId) return

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })

      setNotifications(data || [])
    }

    fetchNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
          // Optional: Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Update', {
              body: payload.new.message,
            })
          }
        }
      )
      .subscribe((status) => {
        console.log(`Notifications Status: ${status}`)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  return { notifications, markAsRead }
}