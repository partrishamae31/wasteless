import { createClient } from '@supabase/supabase-js'

// Replace with your keys from Supabase Dashboard -> Settings -> API
const supabaseUrl = 'https://hpwwojprqyrfzruuvwhk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwd3dvanBycXlyZnpydXV2d2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzE4NDMsImV4cCI6MjA4NzQwNzg0M30.DnusMBYWOvOlZNDPTEhzDR9KUCfIQ-J78c4uJ6loVN4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)