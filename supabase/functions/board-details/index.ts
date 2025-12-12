import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { boardId } = await req.json()

        if (!boardId) throw new Error('boardId is required')

        // Fetch Board
        const { data: board, error: boardError } = await supabaseClient
            .from('boards')
            .select('*')
            .eq('id', boardId)
            .single()

        if (boardError) throw boardError

        // Fetch Members
        const { data: members, error: memError } = await supabaseClient
            .from('board_members')
            .select('*, profiles(full_name, avatar_url, email)')
            .eq('board_id', boardId)

        if (memError) throw memError

        // Fetch Columns and Nested Tasks
        // Note: Supabase can do deep nesting
        const { data: columns, error: colError } = await supabaseClient
            .from('columns')
            .select(`
            *,
            tasks (
                *,
                profiles:assignee_id(full_name, avatar_url)
            )
        `)
            .eq('board_id', boardId)
            .order('position')

        // Need to sort tasks too? Supabase order() on nested resource is tricky in JS client string builder
        // Usually .order('position', { foreignTable: 'tasks' }) work.
        // Let's retry that syntax or sort in memory for robust edge function response (since CPU is cheap here).

        if (colError) throw colError

        // Sort tasks in memory to be safe 
        const sortedColumns = columns.map(col => ({
            ...col,
            tasks: (col.tasks || []).sort((a, b) => a.position - b.position)
        }))

        return new Response(JSON.stringify({ board, columns: sortedColumns, members }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
