import { createClient } from '@supabase/supabase-js'

// The anon/public key is designed to be embedded in client apps — it is safe here.
// Row-Level Security on the `workspaces` table is what keeps each user's data private.
export const SUPABASE_URL = 'https://lfvuehgzomqjptcondbq.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmdnVlaGd6b21xanB0Y29uZGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzQ4MjksImV4cCI6MjA5NjAxMDgyOX0.c5MXBtXZs8DR4L-AtuuC4u8qcITizxKI3LxFEMzRjRo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'ejs.supabase.auth',
  },
})
