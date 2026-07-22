import { useState, useEffect, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { Save, Loader2, Database } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettings } from '@/hooks/use-queries'
import { useUpdateSettings } from '@/hooks/use-queries'
import { useAuth } from '@/hooks/use-auth'
import { salaryRulesService } from '@/services/api'
import { toast } from 'sonner'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const { user } = useAuth()
  const [seeding, setSeeding] = useState(false)

  const [formData, setFormData] = useState({
    base_salary: 970,
    meal_allowance: 90,
    thirteenth_month: true,
    fourteenth_month: true,
    default_city: 'Porto',
    payment_day: 15,
    payment_month: 12,
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'pt',
    currency: 'EUR',
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        base_salary: settings.base_salary || 0,
        meal_allowance: settings.meal_allowance || 0,
        thirteenth_month: settings.thirteenth_month ?? true,
        fourteenth_month: settings.fourteenth_month ?? true,
        default_city: settings.default_city || 'Porto',
        payment_day: settings.payment_day || 25,
        payment_month: settings.payment_month || 12,
        theme: settings.theme || 'system',
        language: settings.language || 'pt',
        currency: settings.currency || 'EUR',
      })
    }
  }, [settings])

  const handleSave = async () => {
    await updateSettings.mutateAsync(formData)
  }

  const handleSeedRules = async () => {
    if (!user) return
    setSeeding(true)
    try {
      const created = await salaryRulesService.seedDefaults(user.id)
      if (created) {
        toast.success('Regras padrão carregadas com sucesso!')
      } else {
        toast.info('Regras já existem. Nenhuma alteração necessária.')
      }
    } catch {
      toast.error('Erro ao carregar regras')
    } finally {
      setSeeding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Personalize seu sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedRules} disabled={seeding}>
            {seeding ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            Regras Padrão
          </Button>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Salário Base (€)</Label>
                <Input
                  type="number"
                  value={formData.base_salary}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, base_salary: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Subsídio Alimentação (€)</Label>
                <Input
                  type="number"
                  value={formData.meal_allowance}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, meal_allowance: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Duodécimos</Label>
                <Switch
                  checked={formData.fourteenth_month}
                  onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, fourteenth_month: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Subsídio de Natal</Label>
                <Switch
                  checked={formData.thirteenth_month}
                  onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, thirteenth_month: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trabalho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cidade Padrão</Label>
                <Select
                  value={formData.default_city}
                  onValueChange={(value) => { if (value) setFormData(prev => ({ ...prev, default_city: value })) }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Porto">Porto</SelectItem>
                    <SelectItem value="Lisboa">Lisboa</SelectItem>
                    <SelectItem value="Algarve">Algarve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                Pagamento: dia <strong>15</strong> de cada mês
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={formData.theme}
                  onValueChange={(value) => {
                    if (!value) return
                    setFormData(prev => ({ ...prev, theme: value as 'light' | 'dark' | 'system' }))
                    if (value === 'dark') {
                      document.documentElement.classList.add('dark')
                    } else if (value === 'light') {
                      document.documentElement.classList.remove('dark')
                    } else {
                      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                      document.documentElement.classList.toggle('dark', prefersDark)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => { if (value) setFormData(prev => ({ ...prev, language: value })) }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => { if (value) setFormData(prev => ({ ...prev, currency: value })) }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="USD">Dólar ($)</SelectItem>
                    <SelectItem value="GBP">Libra (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
