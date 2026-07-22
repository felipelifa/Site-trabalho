import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthContext } from '@/hooks/use-auth-context'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas nao coincidem',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { signUpWithEmail } = useAuthContext()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError('')
    setSuccess('')
    const result = await signUpWithEmail(data.email, data.password, data.name)
    setIsLoading(false)
    if (result.success) {
      const userData = result.data as { user?: { identities?: unknown[] } } | undefined
      if (userData?.user?.identities?.length === 0) {
        setError('Este email ja esta registrado.')
      } else {
        setSuccess('Conta criada! Verifique seu email para confirmar, ou faca login.')
      }
    } else {
      const rawMsg = (result.error as { message?: string })?.message || ''
      let msg = 'Erro ao criar conta.'
      if (rawMsg.includes('rate_limit') || rawMsg.includes('Too Many') || rawMsg.includes('security purposes')) {
        msg = 'Muitas tentativas. Aguarde 1-2 minutos e tente novamente.'
      } else if (rawMsg.includes('already registered') || rawMsg.includes('already been registered')) {
        msg = 'Este email ja esta registrado. Faca login.'
      } else if (rawMsg.includes('valid email')) {
        msg = 'Email invalido.'
      } else if (rawMsg.includes('6 characters') || rawMsg.includes('at least 6')) {
        msg = 'A senha deve ter pelo menos 6 caracteres.'
      } else if (rawMsg) {
        msg = rawMsg
      }
      setError(msg)
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
        <p className="text-muted-foreground">Crie sua conta</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 text-sm text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                className="pl-10"
                {...register('name')}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

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
                placeholder="Minimo 6 caracteres"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repita a senha"
                className="pl-10"
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Criar conta
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Ja tem uma conta?{' '}
        <Link to="/auth/login" className="text-primary hover:underline font-medium">
          Entrar
        </Link>
      </p>
    </motion.div>
  )
}
