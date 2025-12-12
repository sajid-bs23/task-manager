import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useBoards() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select(`
          *,
          board_members (
            user_id,
            role,
            profiles (full_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBoards(data || [])
    } catch (error) {
      console.error('Error fetching boards:', error)
    } finally {
      setLoading(false)
    }
  }

  const createBoard = async (title, description) => {
    try {
      // Use the RPC function which handles board creation + adding owner as member
      const { data, error } = await supabase.rpc('create_board', {
        title,
        description
      })

      if (error) throw error

      // The RPC returns the created board, add it to state
      setBoards([data, ...boards])
      return { data, error: null }
    } catch (error) {
      console.error('Error creating board:', error)
      return { data: null, error }
    }
  }

  const deleteBoard = async (boardId) => {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error
      setBoards(boards.filter(b => b.id !== boardId))
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return {
    boards,
    loading,
    createBoard,
    deleteBoard,
    refetch: fetchBoards,
  }
}