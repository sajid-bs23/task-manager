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

    const fetchBoardData = async () => {
        try {
            setLoading(true)

            const [boardRes, columnsRes] = await Promise.all([
                supabase.from('boards').select('*').eq('id', boardId).single(),
                supabase.from('columns')
                    .select('*, tasks(*)') // Nested select
                    .eq('board_id', boardId)
                    .order('position')
                    .order('position', { foreignTable: 'tasks' }) // Order the nested tasks
            ])

            if (boardRes.error) throw boardRes.error
            if (columnsRes.error) throw columnsRes.error

            setBoard(boardRes.data)
            setColumns(columnsRes.data || [])
        } catch (err) {
            setError(err)
            console.error('Error fetching board data:', err)
        } finally {
            setLoading(false)
        }
    }

    const createColumn = async (title) => {
        try {
            const newPosition = columns.length
            const { data, error } = await supabase
                .from('columns')
                .insert([{ board_id: boardId, title, position: newPosition }])
                .select()
                .single()

            if (error) {
                console.error('Supabase Error creating column:', error)
                throw error
            }
            setColumns([...columns, data])
            return { data, error: null }
        } catch (err) {
            console.error('Exception creating column:', err)
            alert(`Error creating column: ${err.message || JSON.stringify(err)}`) // Proactive alert for user
            return { data: null, error: err }
        }
    }

    const updateColumnOrder = async (newColumns) => {
        // Optimistic update
        setColumns(newColumns)

        try {
            // Prepare updates: id and new position
            const updates = newColumns.map((col, index) => ({
                id: col.id,
                position: index,
                board_id: boardId, // Required for RLS checks usually, though update only needs ID ideally
                title: col.title,   // Supabase upsert requires all not-null fields if not partial? 
                // Actually upsert works with partial if primary key is there.
                // But let's be safe. Wait, upsert needs all required columns if it's an insert, 
                // but for update it relies on PK. 
                // However, supabase-js upsert might assume full row.
            }))

            // It's cleaner to just upsert. But mass upsert might be tricky if we don't have all fields.
            // Let's use a loop or upsert with ignoreDuplicates? NO, we want to update.
            // Easiest way in Supabase is upserting the changed fields.

            const { error } = await supabase
                .from('columns')
                .upsert(
                    newColumns.map((col, index) => ({
                        id: col.id,
                        board_id: boardId,
                        title: col.title,
                        position: index,
                        updated_at: new Date().toISOString()
                    }))
                )

            if (error) throw error
        } catch (err) {
            console.error('Error updating column order:', err)
            // Revert on error? For now just log.
            fetchBoardData()
        }
    }

    const updateColumn = async (columnId, newTitle) => {
        try {
            // Optimistic update
            setColumns(columns.map(col =>
                col.id === columnId ? { ...col, title: newTitle } : col
            ))

            const { error } = await supabase
                .from('columns')
                .update({ title: newTitle })
                .eq('id', columnId)
                .eq('board_id', boardId) // Extra safety

            if (error) throw error
            return { error: null }
        } catch (err) {
            console.error('Error updating column:', err)
            // Revert
            fetchBoardData()
            return { error: err }
        }
    }

    const deleteColumn = async (columnId) => {
        try {
            // Optimistic update
            setColumns(columns.filter(col => col.id !== columnId))

            const { error } = await supabase
                .from('columns')
                .delete()
                .eq('id', columnId)
                .eq('board_id', boardId)

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
            const { data: userData } = await supabase.auth.getUser()
            const creatorId = userData.user.id

            // Find current max position
            const columnTasks = columns.find(c => c.id === columnId)?.tasks || []
            const newPosition = columnTasks.length

            const { data, error } = await supabase
                .from('tasks')
                .insert([{
                    column_id: columnId,
                    title,
                    creator_id: creatorId,
                    position: newPosition
                }])
                .select()
                .single()

            if (error) throw error
            fetchBoardData()
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
            for (const colUpdate of affectedColumns) {
                const { tasks } = colUpdate
                const updates = tasks.map((task, index) => ({
                    ...task, // Include all existing fields (title, creator_id, etc.)
                    column_id: colUpdate.columnId,
                    position: index,
                    updated_at: new Date().toISOString()
                }))

                const { error } = await supabase
                    .from('tasks')
                    .upsert(updates)

                if (error) throw error
            }
        } catch (err) {
            console.error('Error updating task order:', err)
            fetchBoardData()
        }
    }

    const deleteTask = async (taskId) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)

            if (error) throw error
            fetchBoardData()
            return { error: null }
        } catch (err) {
            console.error('Error deleting task:', err)
            return { error: err }
        }
    }

    const updateTask = async (taskId, updates) => {
        try {
            // Optimistic Update
            // Finding the task is hard in nested structure.
            // Simplified: Fetch board data

            const { error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', taskId)

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
        updateTask
    }
}
