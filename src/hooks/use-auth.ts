import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    console.log('[Auth] Inicializando, verificando sessão...')
    console.log('[Auth] Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'configurada' : 'NÃO CONFIGURADA')
    console.log('[Auth] Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'configurada' : 'NÃO CONFIGURADA')
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth] Erro ao obter sessão:', error.message)
        setState({ user: null, session: null, loading: false, error })
        return
      }
      console.log('[Auth] Sessão obtida:', session ? 'autenticado' : 'não autenticado')
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      console.log('[Auth] Tentando login com:', email)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      console.log('[Auth] Resposta do Supabase:', { data: !!data, error })
      if (error) {
        console.error('[Auth] Erro no login:', error.message)
        setState(prev => ({ ...prev, loading: false, error }))
        return { success: false, error }
      }

      if (data.user && data.session) {
        console.log('[Auth] Login bem-sucedido, verificando perfil...')
        try {
          const { data: existing, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle()

          if (profileError) {
            console.warn('[Auth] Erro ao buscar perfil:', profileError.message)
          }

          if (!existing) {
            console.log('[Auth] Criando perfil e configurações...')
            const { error: upsertProfileError } = await supabase.from('profiles').upsert({
              user_id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || '',
            })
            if (upsertProfileError) {
              console.error('[Auth] Erro ao criar perfil:', upsertProfileError.message)
            }
            const { error: upsertSettingsError } = await supabase.from('settings').upsert({
              user_id: data.user.id,
            })
            if (upsertSettingsError) {
              console.error('[Auth] Erro ao criar settings:', upsertSettingsError.message)
            }
          }
        } catch (err) {
          console.error('[Auth] Erro inesperado ao verificar/criar perfil:', err)
        }
      }

      setState({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      })
      return { success: true, data }
    } catch (err) {
      console.error('[Auth] Erro inesperado no login:', err)
      const error = err as AuthError
      setState(prev => ({ ...prev, loading: false, error }))
      return { success: false, error }
    }
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      console.log('[Auth] Tentando registro com:', email)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name || '' } },
      })
      console.log('[Auth] Resposta do registro:', { data: !!data, error })
      if (error) {
        console.error('[Auth] Erro no registro:', error.message)
        setState(prev => ({ ...prev, loading: false, error }))
        return { success: false, error }
      }

      if (data.user && data.session) {
        console.log('[Auth] Registro bem-sucedido, criando perfil...')
        try {
          const { error: upsertProfileError } = await supabase.from('profiles').upsert({
            user_id: data.user.id,
            email: data.user.email || email,
            full_name: name || '',
          })
          if (upsertProfileError) {
            console.error('[Auth] Erro ao criar perfil:', upsertProfileError.message)
          }
          const { error: upsertSettingsError } = await supabase.from('settings').upsert({
            user_id: data.user.id,
          })
          if (upsertSettingsError) {
            console.error('[Auth] Erro ao criar settings:', upsertSettingsError.message)
          }
        } catch (err) {
          console.error('[Auth] Erro inesperado ao criar perfil/settings:', err)
        }
      }

      setState({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      })
      return { success: true, data }
    } catch (err) {
      console.error('[Auth] Erro inesperado no registro:', err)
      const error = err as AuthError
      setState(prev => ({ ...prev, loading: false, error }))
      return { success: false, error }
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }))
      return { success: false, error }
    }
    return { success: true, data }
  }, [])

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
    })
    return { success: true }
  }, [])

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
  }
}
