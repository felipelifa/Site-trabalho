import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: unknown; data?: unknown }>
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: unknown; data?: unknown }>
  signInWithGoogle: () => Promise<{ success: boolean; error?: unknown; data?: unknown }>
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: unknown; data?: unknown }>
  signOut: () => Promise<{ success: boolean; error?: unknown }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  const value: AuthContextType = {
    user: auth.user,
    session: auth.session,
    loading: auth.loading,
    isAuthenticated: !!auth.user,
    signInWithEmail: auth.signInWithEmail,
    signUpWithEmail: auth.signUpWithEmail,
    signInWithGoogle: auth.signInWithGoogle,
    signInWithMagicLink: auth.signInWithMagicLink,
    signOut: auth.signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
