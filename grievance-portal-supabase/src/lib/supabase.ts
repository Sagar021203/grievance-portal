import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const hasValidProjectUrl = (() => {
  try {
    const protocol = new URL(supabaseUrl ?? '').protocol
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
})()

export const isSupabaseConfigured = Boolean(
  hasValidProjectUrl &&
  supabaseUrl &&
  supabasePublishableKey &&
  !supabaseUrl.includes('YOUR_PROJECT') &&
  !supabasePublishableKey.includes('YOUR_SUPABASE'),
)

export const supabase = isSupabaseConfigured && supabaseUrl && supabasePublishableKey
  ? createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null
