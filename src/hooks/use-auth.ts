import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  role: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    role: null,
  })

  const fetchRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    const role = data?.role
    if (!role || role === 'user') return null
    return role
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        setState({ user: null, session: null, loading: false, error, role: null })
        return
      }
      const role = session?.user ? await fetchRole(session.user.id) : null
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
        role,
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const role = session?.user ? await fetchRole(session.user.id) : null
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
        role,
      })
    })

    return () => subscription.unsubscribe()
  }, [fetchRole])

  const setRole = useCallback((role: string | null) => {
    setState(prev => ({ ...prev, role }))
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setState(prev => ({ ...prev, loading: false, error }))
        return { success: false, error }
      }

      if (data.user && data.session) {
        try {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle()

          if (!existing) {
            await supabase.from('profiles').upsert({
              user_id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || '',
            })
            await supabase.from('settings').upsert({
              user_id: data.user.id,
            })
          }
        } catch {
          // Profile/settings creation will be retried on next login
        }
      }

      const role = data.user ? await fetchRole(data.user.id) : null
      setState({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
        role,
      })
      return { success: true, data }
    } catch (err) {
      const error = err as AuthError
      setState(prev => ({ ...prev, loading: false, error }))
      return { success: false, error }
    }
  }, [fetchRole])

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name || '' } },
      })
      if (error) {
        setState(prev => ({ ...prev, loading: false, error }))
        return { success: false, error }
      }

      if (data.user && data.session) {
        try {
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            email: data.user.email || email,
            full_name: name || '',
          })
          await supabase.from('settings').upsert({
            user_id: data.user.id,
          })
        } catch {
          // Profile/settings creation will be retried on next login
        }
      }

      const role = data.user ? await fetchRole(data.user.id) : null
      setState({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
        role,
      })
      return { success: true, data }
    } catch (err) {
      const error = err as AuthError
      setState(prev => ({ ...prev, loading: false, error }))
      return { success: false, error }
    }
  }, [fetchRole])

  const signInWithMagicLink = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }))
      return { success: false, error }
    }
    return { success: true, data }
  }, [])

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    const { error } = await supabase.auth.signOut()
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }))
      return { success: false, error }
    }
    setState({
      user: null,
      session: null,
      loading: false,
      error: null,
      role: null,
    })
    return { success: true }
  }, [])

  return {
    ...state,
    setRole,
    signInWithEmail,
    signUpWithEmail,
    signInWithMagicLink,
    signOut,
  }
}
