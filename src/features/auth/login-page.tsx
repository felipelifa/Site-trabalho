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
  const { signInWithEmail, signInWithMagicLink } = useAuthContext()
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
