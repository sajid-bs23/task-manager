import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('--- CHECKING PROFILES ---')
    const { data: profiles, error } = await supabase.from('profiles').select('*')
    if (error) console.error('Error fetching profiles:', error)
    else console.table(profiles)

    console.log('\n--- CHECKING USERS (Auth) ---')
    // Can't list users easily with anon key usually, unless exposed or using service role.
    // Try to get current user if we have a token? No, we are running as anon/service.
    // Actually, createClient with anon key can only see what RLS allows.
    // If profiles has no RLS, we should see all profiles.

    console.log('\n--- CHECKING COMMENTS ---')
    const { data: comments, error: cErr } = await supabase.from('task_comments').select('*')
    if (cErr) console.error('Error fetching comments:', cErr)
    else console.table(comments)
}

check()
