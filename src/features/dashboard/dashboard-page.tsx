import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Zap,
  Plane,
  ChevronRight,
  ChevronLeft,
  MapPin,
  X,
  Clock,
  Target,
  Download,
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuthContext } from '@/hooks/use-auth-context'
import {
  useCurrentWeek,
  useWorkWeeks,
  useWorkDays,
  useWorkDaysByMonth,
  useSettings,
  useSalaryRules,
  useEnsureCompetency,
} from '@/hooks/use-queries'
import { calculateMonthEarnings } from '@/utils/rules-engine'
import { isNationalHoliday, isFafeMunicipalHoliday } from '@/utils/holidays'

function formatEuro(value: number): string {
  return `€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { data: currentWeek } = useCurrentWeek()
  const { data: allWeeks = [] } = useWorkWeeks()
  const ensureCompetency = useEnsureCompetency()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    ensureCompetency.mutate()
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      alert('Para instalar: toque no botão de Partilhar (iOS) ou nos 3 pontos (Android) e selecione "Adicionar ao ecrã inicial".')
    }
  }

  const displayWeek = useMemo(() => {
    if (allWeeks.length > 0) return allWeeks[0]
    return currentWeek
  }, [allWeeks, currentWeek])

  const { data: workDays = [] } = useWorkDays(displayWeek?.id ?? '')
  const { data: settings } = useSettings()
  const { data: rules = [] } = useSalaryRules()

  const now = new Date()
  const selectedMonth = selectedDate.getMonth() + 1
  const selectedYear = selectedDate.getFullYear()
  const { data: monthWorkDays = [] } = useWorkDaysByMonth(selectedYear, selectedMonth)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()

  const monthEarnings = useMemo(() => {
    if (!monthWorkDays.length) return { total: 0, breakdown: [] }
    return calculateMonthEarnings(monthWorkDays, rules, settings ?? undefined)
  }, [monthWorkDays, rules, settings])

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const daysPassed = isCurrentMonth ? now.getDate() : (selectedDate < now ? daysInMonth : 0)
  const daysLeftInMonth = daysInMonth - daysPassed
  const progressPercent = Math.round((daysPassed / daysInMonth) * 100)

  const workedDaysMonth = monthWorkDays.filter(d => d.worked).length
  const absenceDaysMonth = monthWorkDays.filter(d => d.is_absence).length
  const justifiedAbsenceDaysMonth = monthWorkDays.filter(d => d.is_absence && d.absence_type === 'justified').length
  const normalAbsenceDaysMonth = absenceDaysMonth - justifiedAbsenceDaysMonth
  const vacationDaysMonth = monthWorkDays.filter(d => d.is_vacation).length
  const saturdaysMonth = monthWorkDays.filter(d => {
    const date = new Date(d.date)
    return date.getDay() === 6 && d.worked
  }).length
  const totalWeeks = allWeeks.filter(w => {
    const d = new Date(w.start_date)
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
  }).length

  const getGreeting = () => {
    const hour = now.getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const getWorkDay = (dateStr: string) => workDays.find(d => d.date === dateStr)

  const assistantMessage = useMemo(() => {
    const todayStr = format(now, 'yyyy-MM-dd')
    const todayDow = now.getDay()

    if (isNationalHoliday(now) || isFafeMunicipalHoliday(now)) {
      const todayWorkDay = workDays.find(d => d.date === todayStr)
      if (!todayWorkDay) {
        return { type: 'holiday' as const, text: 'Hoje é feriado. Trabalhou?', icon: '🔵' }
      }
      if (todayWorkDay.worked) {
        return { type: 'info' as const, text: 'Feriado trabalhado. Bônus aplicado.', icon: '🔵' }
      }
      return { type: 'info' as const, text: 'Hoje é feriado. Folga registrada.', icon: '🔵' }
    }

    const weekDays = monthWorkDays.filter(d => {
      const date = new Date(d.date)
      return date >= weekStart && date <= weekEnd
    })

    if (weekDays.length === 0) {
      return { type: 'action' as const, text: 'Nova semana. Escolha o destino e comece.', icon: '📅' }
    }

    const todayRegistered = workDays.find(d => d.date === todayStr)
    if (!todayRegistered && todayDow >= 1 && todayDow <= 5) {
      return { type: 'warning' as const, text: 'Hoje ainda não foi registado. Clique em "Registar Hoje".', icon: '⚠️' }
    }

    if (todayDow === 6) {
      const satDay = workDays.find(d => d.date === todayStr)
      if (satDay && !satDay.worked) {
        return { type: 'info' as const, text: 'É sábado. Trabalhou? Registe na semana.', icon: '📋' }
      }
    }

    const pendingDays = workDays.filter(d => {
      const date = new Date(d.date)
      const dow = date.getDay()
      return dow >= 1 && dow <= 5 && !d.worked && !d.is_absence && !d.is_vacation && !d.is_holiday
    })

    if (pendingDays.length > 0) {
      return { type: 'warning' as const, text: `Falta registar ${pendingDays.length} dia(s) desta semana.`, icon: '⚠️' }
    }

    return { type: 'success' as const, text: 'Tudo registado. Bom trabalho!', icon: '🟢' }
  }, [workDays, monthWorkDays, now, weekStart, weekEnd])

  const pendingItems = useMemo(() => {
    const items: string[] = []
    const weekDays = workDays.filter(d => {
      const date = new Date(d.date)
      return date >= weekStart && date <= weekEnd && date.getDay() >= 1 && date.getDay() <= 6
    })

    const sat = weekDays.find(d => new Date(d.date).getDay() === 6)
    if (sat && !sat.worked && !sat.is_absence && !sat.is_vacation && !sat.is_holiday) {
      items.push('Sábado')
    }

    weekDays.forEach(d => {
      const date = new Date(d.date)
      const dow = date.getDay()
      if (dow >= 1 && dow <= 5 && !d.worked && !d.is_absence && !d.is_vacation && !d.is_holiday) {
        items.push(format(date, "EEEE", { locale: pt }))
      }
    })

    return items
  }, [workDays, weekStart, weekEnd])

  const nextEvents = useMemo(() => {
    const events: { date: Date; label: string }[] = []
    const competenceEnd = new Date(selectedYear, selectedMonth, 0)
    const nextCompetence = new Date(selectedYear, selectedMonth, 1)
    const payment = new Date(selectedYear, selectedMonth, 15)

    if (payment <= now) {
      payment.setMonth(payment.getMonth() + 1)
    }

    events.push({ date: competenceEnd, label: 'Fim da competência' })
    events.push({ date: nextCompetence, label: 'Nova competência' })
    events.push({ date: payment, label: 'Recebimento previsto' })

    return events
      .filter(e => e.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3)
  }, [selectedYear, selectedMonth, now])

  const financialBreakdown = useMemo(() => {
    const items: { label: string; amount: number; positive: boolean }[] = []

    const base = 820
    const absenceTotal = (normalAbsenceDaysMonth * 80) + (justifiedAbsenceDaysMonth * 40)
    const baseNet = base - absenceTotal

    items.push({ label: 'Salário Base', amount: baseNet, positive: true })

    const mealDays = workedDaysMonth
    const mealTotal = mealDays * 4.27
    if (mealTotal > 0) items.push({ label: 'Subsídio Alimentação', amount: mealTotal, positive: true })

    items.push({ label: 'Duodécimos', amount: 150, positive: true })

    const weekBonuses = monthEarnings.breakdown
      .filter(b => b.rule_name.startsWith('Semana'))
    weekBonuses.forEach(b => {
      items.push({ label: b.rule_name, amount: b.amount, positive: true })
    })

    const satBonuses = monthEarnings.breakdown
      .filter(b => b.rule_name.startsWith('Sábado'))
    satBonuses.forEach(b => {
      items.push({ label: b.rule_name, amount: b.amount, positive: true })
    })

    const holBonuses = monthEarnings.breakdown
      .filter(b => b.rule_name.startsWith('Feriado'))
    holBonuses.forEach(b => {
      items.push({ label: b.rule_name, amount: b.amount, positive: true })
    })

    if (absenceTotal > 0) {
      items.push({ label: 'Descontos (faltas)', amount: -absenceTotal, positive: false })
    }

    return items.filter(i => i.amount !== 0)
  }, [monthEarnings, workedDaysMonth, absenceDaysMonth, normalAbsenceDaysMonth, justifiedAbsenceDaysMonth])

  const weekDayColors: Record<string, string> = {
    worked: 'bg-green-500',
    absence: 'bg-red-500',
    vacation: 'bg-yellow-500',
    holiday: 'bg-blue-500',
    off: 'bg-gray-300 dark:bg-gray-600',
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="flex flex-col lg:flex-row gap-4 lg:gap-6"
    >
      <div className="flex-1 space-y-4">
        <motion.div variants={item}>
          <Button variant="outline" size="sm" onClick={handleInstall} className="w-full border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
            <Download className="w-4 h-4 mr-2" />
            Instalar Aplicação no Telemóvel
          </Button>
        </motion.div>

        <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              {getGreeting()}, {user?.email?.split('@')[0]} 👋
            </h1>
            <p className="text-sm md:text-base text-muted-foreground capitalize">
              {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(subMonths(selectedDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-[120px]">
              <p className="text-sm font-bold text-foreground capitalize">{format(selectedDate, "MMMM", { locale: pt })}</p>
              <p className={`text-[10px] font-medium ${
                isCurrentMonth
                  ? 'text-green-600 dark:text-green-400'
                  : selectedDate < new Date(now.getFullYear(), now.getMonth(), 1)
                    ? 'text-muted-foreground'
                    : 'text-primary'
              }`}>
                {isCurrentMonth ? 'Mês Atual' : selectedDate < new Date(now.getFullYear(), now.getMonth(), 1) ? 'Mês Passado' : 'Próximo Mês'}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(addMonths(selectedDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Competência: {format(selectedDate, 'MMMM yyyy', { locale: pt })}
            </Badge>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Próximo Pagamento</span>
              </div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
                {formatEuro(monthEarnings.total)}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Competência</p>
                  <p className="font-medium text-foreground capitalize">{format(now, 'MMMM yyyy', { locale: pt })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pagamento previsto</p>
                  <p className="font-medium text-foreground">
                    15 {format(addMonths(now, 1), 'MMMM', { locale: pt })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${
            assistantMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
            assistantMessage.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' :
            assistantMessage.type === 'action' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' :
            'bg-muted/50 border-border'
          }`}>
            <span className="text-lg">{assistantMessage.icon}</span>
            <p className={`text-sm font-medium ${
              assistantMessage.type === 'success' ? 'text-green-700 dark:text-green-400' :
              assistantMessage.type === 'warning' ? 'text-yellow-700 dark:text-yellow-400' :
              assistantMessage.type === 'action' ? 'text-blue-700 dark:text-blue-400' :
              'text-foreground'
            }`}>
              {assistantMessage.text}
            </p>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progresso da competência</span>
                <span className="font-bold text-foreground">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-1">
                Faltam {daysLeftInMonth} dias para encerrar a competência
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            variant="outline"
            className="h-auto py-3 sm:py-4 flex flex-col items-center gap-1.5 hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 dark:hover:border-green-700"
            onClick={() => navigate('/calendar')}
          >
            <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium">Registar Hoje</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 sm:py-4 flex flex-col items-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-300 dark:hover:border-blue-700"
            onClick={() => navigate('/calendar')}
          >
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium">Semana Padrão</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 sm:py-4 flex flex-col items-center gap-1.5 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 hover:border-yellow-300 dark:hover:border-yellow-700"
            onClick={() => navigate('/calendar')}
          >
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs font-medium">Exceção</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 sm:py-4 flex flex-col items-center gap-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-300 dark:hover:border-purple-700"
            onClick={() => navigate('/calendar')}
          >
            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium">Abrir Semana</span>
          </Button>
        </motion.div>

        {pendingItems.length > 0 && (
          <motion.div variants={item}>
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Pendências</span>
                </div>
                <div className="space-y-1">
                  {pendingItems.map((item, i) => (
                    <p key={i} className="text-sm text-yellow-600 dark:text-yellow-400">• {item}</p>
                  ))}
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 p-0 h-auto text-yellow-700 dark:text-yellow-400"
                  onClick={() => navigate('/calendar')}
                >
                  Ir para semanas <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {pendingItems.length === 0 && workDays.length > 0 && (
          <motion.div variants={item}>
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Tudo registado nesta semana.</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={item}>
          <div
            className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/calendar')}
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1 min-w-[40px]">
                <span className="text-xs font-bold text-muted-foreground">SEM {displayWeek?.week_number ?? '-'}</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{displayWeek?.destination ?? '-'}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {DAY_LABELS.map((day, index) => {
                  const dayDate = new Date(weekStart)
                  dayDate.setDate(dayDate.getDate() + index)
                  const dateStr = format(dayDate, 'yyyy-MM-dd')
                  const workDay = getWorkDay(dateStr)
                  let status = 'off'
                  if (workDay?.worked) status = 'worked'
                  else if (workDay?.is_holiday) status = 'holiday'
                  else if (workDay?.is_vacation) status = 'vacation'
                  else if (workDay?.is_absence) status = 'absence'

                  return (
                    <div key={day} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground">{day}</span>
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${weekDayColors[status]} flex items-center justify-center`}>
                        {status === 'worked' && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                        {status === 'absence' && <X className="w-2.5 h-2.5 text-white" />}
                        {status === 'vacation' && <Plane className="w-2.5 h-2.5 text-white" />}
                        {status === 'holiday' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        {status === 'off' && <div className="w-1 h-1 rounded-full bg-white/60" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </motion.div>

        {nextEvents.length > 0 && (
          <motion.div variants={item}>
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">Próximos Eventos</p>
                {nextEvents.map((event, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {format(event.date, "d 'de' MMMM", { locale: pt })}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{event.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={item} className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg sm:text-2xl font-bold text-foreground">{workedDaysMonth}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Dias</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg sm:text-2xl font-bold text-foreground">{totalWeeks}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Semanas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg sm:text-2xl font-bold text-foreground">{saturdaysMonth}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Sábados</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className={`text-lg sm:text-2xl font-bold ${absenceDaysMonth > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
              {absenceDaysMonth}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Faltas</p>
          </div>
        </motion.div>
      </div>

      <div className="lg:w-72 xl:w-80 shrink-0">
        <div className="lg:sticky lg:top-20 space-y-4">
          <motion.div variants={item}>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Resumo Financeiro</span>
                </div>
                <div className="space-y-2">
                  {financialBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className={`text-xs font-medium ${item.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {item.positive ? '+' : ''}€{Math.abs(item.amount).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Total</span>
                    <span className="text-lg font-bold text-foreground">{formatEuro(monthEarnings.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Competência</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mês</span>
                    <span className="font-medium text-foreground capitalize">{format(now, 'MMMM yyyy', { locale: pt })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fim</span>
                    <span className="font-medium text-foreground">
                      {format(new Date(selectedYear, selectedMonth, 0), "d 'de' MMMM", { locale: pt })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recebimento</span>
                    <span className="font-medium text-foreground">
                      15 {format(addMonths(now, 1), 'MMMM', { locale: pt })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registrado</span>
                    <span className="font-medium text-foreground">{workedDaysMonth} dias</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Estatísticas Rápidas</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">{workedDaysMonth}</p>
                    <p className="text-[10px] text-muted-foreground">Trabalhados</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">{vacationDaysMonth}</p>
                    <p className="text-[10px] text-muted-foreground">Férias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
