import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://crtcznclfkxqhwmmgawl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNydGN6bmNsZmt4cWh3bW1nYXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzU2MjEsImV4cCI6MjA5OTcxMTYyMX0.dYNfY7QJotuVtv2BgyAgSZwCM9XEvMDZlj4uRFrflk0'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
