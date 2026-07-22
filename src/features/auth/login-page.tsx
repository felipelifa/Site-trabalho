import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthContext } from '@/hooks/use-auth-context'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle, signInWithMagicLink } = useAuthContext()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkEmail, setMagicLinkEmail] = useState('')
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError('')
    const result = await signInWithEmail(data.email, data.password)
    setIsLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      const rawMsg = (result.error as { message?: string })?.message || ''
      let msg = 'Erro ao fazer login.'
      if (rawMsg.includes('Invalid login credentials')) {
        msg = 'Email ou senha invalidos.'
      } else if (rawMsg.includes('Email not confirmed')) {
        msg = 'Email nao confirmado. Verifique sua caixa de entrada.'
      } else if (rawMsg.includes('rate_limit') || rawMsg.includes('Too Many') || rawMsg.includes('security purposes')) {
        msg = 'Muitas tentativas. Aguarde 1-2 minutos e tente novamente.'
      } else if (rawMsg) {
        msg = rawMsg
      }
      setError(msg)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    await signInWithGoogle()
    setIsLoading(false)
  }

  const handleMagicLink = async () => {
    if (!magicLinkEmail) return
    setIsLoading(true)
    const result = await signInWithMagicLink(magicLinkEmail)
    setIsLoading(false)
    if (result.success) {
      setMagicLinkSent(true)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
          <span className="text-primary-foreground font-bold text-xl">W</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">WorkFlow PT</h1>
        <p className="text-muted-foreground">Entre na sua conta</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="pl-10"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pl-10 pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou continue com</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              const email = prompt('Digite seu email para o Magic Link:')
              if (email) {
                setMagicLinkEmail(email)
                handleMagicLink()
              }
            }}
            disabled={isLoading}
            className="w-full"
          >
            <Mail className="w-4 h-4 mr-2" />
            Magic Link
          </Button>
        </div>

        {magicLinkSent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 text-sm text-center"
          >
            Link enviado! Verifique seu email.
          </motion.div>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <Link to="/auth/register" className="text-primary hover:underline font-medium">
          Criar conta
        </Link>
      </p>
    </motion.div>
  )
}
