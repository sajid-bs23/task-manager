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

        if (action === 'invite') {
            const { boardId, email } = payload

            // 1. Check if user exists
            // Note: With standard RLS/auth, listing all users is restricted.
            // We can query 'profiles' if RLS allows public read (which we decided it did for names/avatars)
            // OR filtering by email might be allowed.

            const { data: profile, error: profError } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('email', email.trim().toLowerCase()) // standard email norm
                .single()

            if (!profile) {
                return new Response(JSON.stringify({ error: 'User not found. They must be registered first.' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404
                })
            }

            // 2. Add to board_members
            const { error: insertError } = await supabaseClient
                .from('board_members')
                .insert({
                    board_id: boardId,
                    user_id: profile.id,
                    role: 'member'
                })

            if (insertError) {
                if (insertError.code === '23505') { // Unique violation
                    return new Response(JSON.stringify({ error: 'User is already a member.' }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 400
                    })
                }
                throw insertError
            }

            return new Response(JSON.stringify({ success: true, message: 'User invited.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'remove') {
            const { boardId, userId } = payload

            // Only owner can remove? 
            // RLS policy: "Owners can manage board members".
            // Code here runs with user auth, so RLS is enforced automatically!

            const { error } = await supabaseClient
                .from('board_members')
                .delete()
                .eq('board_id', boardId)
                .eq('user_id', userId)

            if (error) throw error
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        throw new Error('Invalid action')

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
