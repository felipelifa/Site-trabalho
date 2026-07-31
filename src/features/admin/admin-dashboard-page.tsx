import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Users2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plane,
  Clock,
  Briefcase,
  BarChart3,
  Settings,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAdminDashboardStats } from '@/hooks/use-admin-queries'

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { data: stats, isLoading } = useAdminDashboardStats()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-6"
    >
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            {getGreeting()}, Admin 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Painel de controlo da operação
          </p>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '-' : stats?.activeEmployees ?? 0}</p>
                <p className="text-xs text-muted-foreground">Funcionários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '-' : stats?.teamsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Equipes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '-' : `${stats?.competencyPercent ?? 0}%`}</p>
                <p className="text-xs text-muted-foreground">Competência</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '-' : stats?.publishedOps ?? 0}</p>
                <p className="text-xs text-muted-foreground">Operações Publicadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '-' : stats?.pendingCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pendências</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                <Plane className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '-' : stats?.vacationCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Em Férias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '-' : stats?.awayCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Afastados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <p className="text-sm font-medium text-muted-foreground mb-3">Acesso Rápido</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-300"
            onClick={() => navigate('/admin/employees')}
          >
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium">Funcionários</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-300"
            onClick={() => navigate('/admin/teams')}
          >
            <Users2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium">Equipes</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300"
            onClick={() => navigate('/admin/planning')}
          >
            <Briefcase className="w-6 h-6 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium">Planejamento</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:border-amber-300"
            onClick={() => navigate('/admin/history')}
          >
            <BarChart3 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium">Histórico</span>
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Configurações</p>
                  <p className="text-xs text-muted-foreground">Gerir veículos, regras e preferências</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/settings')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
