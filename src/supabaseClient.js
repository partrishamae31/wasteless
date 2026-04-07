import { createClient } from '@supabase/supabase-js'

// Replace these with the actual values from your Supabase Dashboard
const supabaseUrl = 'https://hpwwojprqyrfzruuvwhk.supabase.co'
const supabaseAnonKey = 'sb_secret_jGHVGwaWEqhsaeKkHSd-sw_-aNST_Yq'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)