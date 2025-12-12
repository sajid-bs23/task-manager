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

        const { action, ...payload } = await req.json()

        // POST (Create)
        if (action === 'create') {
            const { boardId, title, position } = payload
            const { data, error } = await supabaseClient
                .from('columns')
                .insert({ board_id: boardId, title, position })
                .select()
                .single()
            if (error) throw error
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // PUT (Update/Rename/Move)
        if (action === 'update') {
            const { id, title, position, boardId } = payload // boardId needed for RLS usually? not for update if policy is on ID
            const updates: any = {}
            if (title) updates.title = title
            if (position !== undefined) updates.position = position

            const { error } = await supabaseClient
                .from('columns')
                .update(updates)
                .eq('id', id)

            if (error) throw error
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // BATCH UPDATE (Order)
        if (action === 'reorder') {
            const { columns } = payload // Array of { id, position }
            const { error } = await supabaseClient
                .from('columns')
                .upsert(columns.map((c: any) => ({
                    id: c.id,
                    position: c.position,
                    board_id: c.board_id,
                    title: c.title,
                    updated_at: new Date()
                })))

            if (error) throw error
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // DELETE
        if (action === 'delete') {
            const { id } = payload
            const { error } = await supabaseClient
                .from('columns')
                .delete()
                .eq('id', id)

            if (error) throw error
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        throw new Error('Invalid action')

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
