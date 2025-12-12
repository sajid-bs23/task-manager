import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks(columnId) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!columnId) return

    fetchTasks()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`tasks-${columnId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `column_id=eq.${columnId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(task =>
              task.id === payload.new.id ? payload.new : task
            ))
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [columnId])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          creator:profiles!tasks_creator_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('column_id', columnId)
        .order('position', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (columnId, title, description = '') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get max position
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('position')
        .eq('column_id', columnId)
        .order('position', { ascending: false })
        .limit(1)

      const position = existingTasks && existingTasks.length > 0
        ? existingTasks[0].position + 1
        : 0

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          column_id: columnId,
          title,
          description,
          position,
          creator_id: user.id,
        })
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          creator:profiles!tasks_creator_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const updateTask = async (taskId, updates) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          creator:profiles!tasks_creator_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const deleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const moveTask = async (taskId, newColumnId, newPosition) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          column_id: newColumnId,
          position: newPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    refetch: fetchTasks,
  }
}

