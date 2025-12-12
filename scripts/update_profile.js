import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
// Note: Anon key might not be allowed to UPDATE profiles if RLS blocks it.
// However, I just found RLS is disabled/open for profiles! So it should work.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function update() {
    console.log('--- UPDATING PROFILE ---')
    const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: 'Sajid' })
        .eq('email', 'ahmadalsajid@gmail.com')
        .select()

    if (error) console.error('Error updating:', error)
    else console.log('Updated:', data)
}

update()
