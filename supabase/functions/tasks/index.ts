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
        const { data: { user } } = await supabaseClient.auth.getUser()

        if (action === 'create') {
            const { columnId, title, position } = payload
            const { data, error } = await supabaseClient
                .from('tasks')
                .insert({
                    column_id: columnId,
                    title,
                    position,
                    creator_id: user?.id
                })
                .select()
                .single()
            if (error) throw error
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'update') {
            const { id, updates } = payload
            const { error } = await supabaseClient
                .from('tasks')
                .update(updates)
                .eq('id', id)
            if (error) throw error
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Batch Reorder
        if (action === 'reorder') {
            const { tasks } = payload
            const { error } = await supabaseClient
                .from('tasks')
                .upsert(tasks.map((t: any) => ({
                    ...t,
                    updated_at: new Date()
                })))
            if (error) throw error
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'delete') {
            const { id } = payload
            const { error } = await supabaseClient
                .from('tasks')
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
