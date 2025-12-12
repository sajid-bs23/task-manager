import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useBoardData(boardId) {
    const [board, setBoard] = useState(null)
    const [columns, setColumns] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (boardId) {
            fetchBoardData()
        }
    }, [boardId])

    const [members, setMembers] = useState([])

    const fetchBoardData = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase.functions.invoke('board-details', {
                body: { boardId }
            })

            if (error) throw error

            setBoard(data.board)
            setColumns(data.columns || [])
            setMembers(data.members || [])
        } catch (err) {
            setError(err)
            console.error('Error fetching board data:', err)
        } finally {
            setLoading(false)
        }
    }

    const inviteMember = async (email) => {
        try {
            const { data, error } = await supabase.functions.invoke('board-members', {
                body: { action: 'invite', boardId, email }
            })

            if (error || data?.error) throw error || new Error(data?.error)

            await fetchBoardData() // Reload members
            return { error: null }
        } catch (err) {
            return { error: err }
        }
    }

    const removeMember = async (userId) => {
        try {
            const { error } = await supabase.functions.invoke('board-members', {
                body: { action: 'remove', boardId, userId }
            })

            if (error) throw error
            await fetchBoardData()
            return { error: null }
        } catch (err) {
            return { error: err }
        }
    }


    const createColumn = async (title) => {
        try {
            const newPosition = columns.length
            const { data, error } = await supabase.functions.invoke('columns', {
                body: { action: 'create', boardId, title, position: newPosition }
            })

            if (error) throw error
            setColumns([...columns, data])
            return { data, error: null }
        } catch (err) {
            console.error('Exception creating column:', err)
            return { data: null, error: err }
        }
    }

    const updateColumnOrder = async (newColumns) => {
        setColumns(newColumns) // Optimistic
        try {
            const { error } = await supabase.functions.invoke('columns', {
                body: {
                    action: 'reorder',
                    columns: newColumns.map((c, i) => ({ ...c, position: i }))
                }
            })
            if (error) throw error
        } catch (err) {
            console.error('Error updating column order:', err)
            fetchBoardData()
        }
    }

    const updateColumn = async (columnId, newTitle) => {
        setColumns(columns.map(col =>
            col.id === columnId ? { ...col, title: newTitle } : col
        ))
        try {
            const { error } = await supabase.functions.invoke('columns', {
                body: { action: 'update', id: columnId, title: newTitle }
            })
            if (error) throw error
            return { error: null }
        } catch (err) {
            console.error('Error updating column:', err)
            fetchBoardData()
            return { error: err }
        }
    }

    const deleteColumn = async (columnId) => {
        setColumns(columns.filter(col => col.id !== columnId))
        try {
            const { error } = await supabase.functions.invoke('columns', {
                body: { action: 'delete', id: columnId }
            })
            if (error) throw error
            return { error: null }
        } catch (err) {
            console.error('Error deleting column:', err)
            fetchBoardData()
            return { error: err }
        }
    }

    const createTask = async (columnId, title) => {
        try {
            const columnTasks = columns.find(c => c.id === columnId)?.tasks || []
            const newPosition = columnTasks.length // Simplified, backend can handle too but good for now

            const { data, error } = await supabase.functions.invoke('tasks', {
                body: { action: 'create', columnId, title, position: newPosition }
            })

            if (error) throw error
            await fetchBoardData() // Reload to get full state
            return { data, error: null }
        } catch (err) {
            console.error('Error creating task:', err)
            return { error: err }
        }
    }

    const updateTaskOrder = async (affectedColumns) => {
        // Optimistic
        const newColumns = columns.map(col => {
            const affected = affectedColumns.find(c => c.columnId === col.id)
            if (affected) {
                return { ...col, tasks: affected.tasks }
            }
            return col
        })
        setColumns(newColumns)

        try {
            // Flatten updates
            const tasksToUpdate = []
            for (const colUpdate of affectedColumns) {
                colUpdate.tasks.forEach((task, index) => {
                    tasksToUpdate.push({ ...task, column_id: colUpdate.columnId, position: index })
                })
            }

            const { error } = await supabase.functions.invoke('tasks', {
                body: { action: 'reorder', tasks: tasksToUpdate }
            })

            if (error) throw error
        } catch (err) {
            console.error('Error updating task order:', err)
            fetchBoardData()
        }
    }

    const deleteTask = async (taskId) => {
        try {
            const { error } = await supabase.functions.invoke('tasks', {
                body: { action: 'delete', id: taskId }
            })

            if (error) throw error
            await fetchBoardData()
            return { error: null }
        } catch (err) {
            console.error('Error deleting task:', err)
            return { error: err }
        }
    }

    const updateTask = async (taskId, updates) => {
        try {
            const { error } = await supabase.functions.invoke('tasks', {
                body: { action: 'update', id: taskId, updates }
            })

            if (error) throw error
            await fetchBoardData()
            return { error: null }
        } catch (err) {
            console.error(err)
            return { error: err }
        }
    }

    return {
        board,
        columns,
        loading,
        error,
        createColumn,
        updateColumn,
        deleteColumn,
        updateColumnOrder,
        createTask,
        updateTaskOrder,
        deleteTask,
        updateTask,
        members,
        inviteMember,
        removeMember
    }
}
