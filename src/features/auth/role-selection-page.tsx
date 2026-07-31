import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Shield, Lock, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthContext } from '@/hooks/use-auth-context'
import { supabase } from '@/lib/supabase'

const ADMIN_PIN = '1234'

export function RoleSelectionPage() {
  const navigate = useNavigate()
  const { user, setRole } = useAuthContext()
  const [selectedRole, setSelectedRole] = useState<'employee' | 'admin' | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectEmployee = async () => {
    if (!user) return
    setIsLoading(true)
    await supabase.from('profiles').update({ role: 'employee' }).eq('user_id', user.id)
    setRole('employee')
    setIsLoading(false)
    navigate('/', { replace: true })
  }

  const handleSelectAdmin = () => {
    setSelectedRole('admin')
    setPin('')
    setPinError('')
  }

  const handlePinSubmit = async () => {
    if (pin !== ADMIN_PIN) {
      setPinError('PIN incorreto')
      return
    }
    if (user) {
      await supabase.from('profiles').update({ role: 'admin' }).eq('user_id', user.id)
    }
    setRole('admin')
    navigate('/admin', { replace: true })
  }

  if (selectedRole === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Acesso Administrador</h1>
            <p className="text-muted-foreground">Digite o PIN de acesso</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
            {pinError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm text-center">
                {pinError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="pin"
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  className="pl-10 text-center text-2xl tracking-[0.5em]"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ''))
                    setPinError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pin.length === 4) {
                      handlePinSubmit()
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>

            <Button
              onClick={handlePinSubmit}
              className="w-full"
              disabled={isLoading || pin.length !== 4}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Entrar como Administrador
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setSelectedRole(null)
                setPin('')
                setPinError('')
              }}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-xl">W</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">WorkFlow PT</h1>
          <p className="text-muted-foreground">Como deseja acessar?</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSelectEmployee}
            disabled={isLoading}
            className="w-full bg-card rounded-2xl border border-border p-6 shadow-sm hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                <User className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Funcionário</p>
                <p className="text-sm text-muted-foreground">
                  Visualizar minha agenda e registar trabalho
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={handleSelectAdmin}
            disabled={isLoading}
            className="w-full bg-card rounded-2xl border border-border p-6 shadow-sm hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                <Shield className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Administrador</p>
                <p className="text-sm text-muted-foreground">
                  Gerir equipes, funcionários e operações
                </p>
              </div>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
