import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const url = new URL(req.url)
        const id = url.searchParams.get('id')

        // GET /boards (List)
        if (req.method === 'GET') {
            const { data, error } = await supabaseClient
                .from('boards')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // POST /boards (Create)
        if (req.method === 'POST') {
            const { title, description } = await req.json()

            // Use RPC or direct insert? RPC was 'create_board' to handle member logic.
            // Let's call the RPC for consistency/safety if logic exists there.
            const { data, error } = await supabaseClient
                .rpc('create_board', { title, description })

            if (error) throw error
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 201
            })
        }

        // DELETE /boards?id=...
        if (req.method === 'DELETE' && id) {
            const { error } = await supabaseClient
                .from('boards')
                .delete()
                .eq('id', id)

            if (error) throw error
            return new Response(JSON.stringify({ message: 'Deleted' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
