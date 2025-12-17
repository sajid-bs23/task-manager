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

        // COMMENTS
        if (action === 'get_comments') {
            const { taskId } = payload
            const { data, error } = await supabaseClient
                .from('task_comments')
                .select('*, profiles(full_name, avatar_url)')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true })
            if (error) throw error
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'add_comment') {
            const { taskId, content } = payload
            const { data, error } = await supabaseClient
                .from('task_comments')
                .insert({
                    task_id: taskId,
                    user_id: user?.id,
                    content
                })
                .select('*, profiles(full_name, avatar_url)')
                .single()
            if (error) throw error
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'delete_comment') {
            const { id } = payload
            const { error } = await supabaseClient
                .from('task_comments')
                .delete()
                .eq('id', id)
            if (error) throw error
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // RELATIONSHIPS
        if (action === 'get_relationships') {
            const { taskId } = payload
            const { data: relData, error: e1 } = await supabaseClient
                .from('task_relationships')
                .select('*, tasks!target_task_id(title)')
                .eq('source_task_id', taskId)

            const { data: incomingRelData, error: e2 } = await supabaseClient
                .from('task_relationships')
                .select('*, tasks!source_task_id(title)')
                .eq('target_task_id', taskId)

            if (e1 || e2) throw e1 || e2

            const outgoing = (relData || []).map((r: any) => ({ ...r, related_task_title: r.tasks.title, direction: 'outgoing' }))
            const incoming = (incomingRelData || []).map((r: any) => ({ ...r, related_task_title: r.tasks.title, direction: 'incoming' }))

            return new Response(JSON.stringify([...outgoing, ...incoming]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'add_relationship') {
            const { taskId, targetId, type } = payload
            const { error } = await supabaseClient
                .from('task_relationships')
                .insert({
                    source_task_id: taskId,
                    target_task_id: targetId,
                    type
                })
            if (error) throw error
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'delete_relationship') {
            const { id } = payload
            const { error } = await supabaseClient
                .from('task_relationships')
                .delete()
                .eq('id', id)
            if (error) throw error
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // SEARCH
        if (action === 'search_tasks') {
            const { query, excludeId } = payload
            const { data, error } = await supabaseClient
                .from('tasks')
                .select('id, title')
                .ilike('title', `%${query}%`)
                .neq('id', excludeId)
                .order('created_at', { ascending: false })
                .limit(5)
            if (error) throw error
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        throw new Error('Invalid action')

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
