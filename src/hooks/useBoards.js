import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useBoards() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase.functions.invoke('boards', {
        method: 'GET'
      })
      if (err) throw err
      setBoards(data)
    } catch (err) {
      setError(err)
      console.error('Error fetching boards:', err)
    } finally {
      setLoading(false)
    }
  }

  const createBoard = async (title, description) => {
    try {
      const { data, error: err } = await supabase.functions.invoke('boards', {
        method: 'POST',
        body: { title, description }
      })

      if (err) throw err
      setBoards([data, ...boards])
      return { data, error: null }
    } catch (err) {
      console.error('Error creating board:', err)
      return { error: err }
    }
  }

  const deleteBoard = async (id) => {
    try {
      const { error: err } = await supabase.functions.invoke(`boards?id=${id}`, {
        method: 'DELETE'
      })
      if (err) throw err
      setBoards(boards.filter(b => b.id !== id))
      return { error: null }
    } catch (err) {
      console.error(err)
      return { error: err }
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