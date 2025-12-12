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
                supabase.from('columns').select('*').eq('board_id', boardId).order('position')
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

    return {
        board,
        columns,
        loading,
        error,
        createColumn,
        updateColumnOrder
    }
}
