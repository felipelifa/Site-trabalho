import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  MapPin,
  Briefcase,
  Check,
  X,
  Plane,
  AlertCircle,
  Target,
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, addMonths } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  useUpsertWorkDay,
  useEnsureCompetency,
} from '@/hooks/use-queries'
import { calculateWeekEarnings } from '@/utils/rules-engine'

function formatEuro(value: number): string {
  return `€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
const CITY_OPTIONS = ['Porto', 'Lisboa', 'Algarve']

export function DashboardPage() {
  const { user } = useAuthContext()
  const { data: currentWeek } = useCurrentWeek()
  const { data: allWeeks = [] } = useWorkWeeks()
  const upsertDay = useUpsertWorkDay()
  const ensureCompetency = useEnsureCompetency()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    ensureCompetency.mutate()
  }, [])

  const displayWeek = useMemo(() => {
    if (allWeeks.length > 0) return allWeeks[0]
    return currentWeek
  }, [allWeeks, currentWeek])

  const { data: workDays = [] } = useWorkDays(displayWeek?.id ?? '')
  const { data: settings } = useSettings()
  const { data: rules = [] } = useSalaryRules()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const { data: monthWorkDays = [] } = useWorkDaysByMonth(currentYear, currentMonth)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const weekEarnings = useMemo(() => {
    if (!workDays.length) return { total: 0, breakdown: [] }
    return calculateWeekEarnings(workDays, rules, settings ?? undefined)
  }, [workDays, rules, settings])

  const daysWorked = workDays.filter(d => d.worked).length
  const daysRemaining = 5 - daysWorked

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const daysPassed = now.getDate()
  const daysLeft = daysInMonth - daysPassed
  const progressPercent = Math.round((daysPassed / daysInMonth) * 100)
  const registeredDays = monthWorkDays.filter(d => d.worked).length

  const getGreeting = () => {
    const hour = now.getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const getWorkDay = (dateStr: string) => workDays.find(d => d.date === dateStr)

  const handleSetDestination = (dateStr: string, city: string) => {
    const existing = getWorkDay(dateStr)
    if (existing) {
      upsertDay.mutate({
        id: existing.id,
        user_id: user!.id,
        week_id: displayWeek!.id,
        date: dateStr,
        day_of_week: existing.day_of_week,
        worked: true,
        destination: city,
        is_holiday: existing.is_holiday,
        is_vacation: existing.is_vacation,
        is_absence: existing.is_absence,
      })
    }
    setSelectedDay(null)
  }

  const handleSetAbsence = (dateStr: string, type: 'holiday' | 'vacation' | 'absence') => {
    const existing = getWorkDay(dateStr)
    if (existing) {
      upsertDay.mutate({
        id: existing.id,
        user_id: user!.id,
        week_id: displayWeek!.id,
        date: dateStr,
        day_of_week: existing.day_of_week,
        worked: false,
        destination: existing.destination,
        is_holiday: type === 'holiday',
        is_vacation: type === 'vacation',
        is_absence: type === 'absence',
      })
    }
    setSelectedDay(null)
  }

  const handleClearDay = (dateStr: string) => {
    const existing = getWorkDay(dateStr)
    if (existing) {
      upsertDay.mutate({
        id: existing.id,
        user_id: user!.id,
        week_id: displayWeek!.id,
        date: dateStr,
        day_of_week: existing.day_of_week,
        worked: false,
        destination: existing.destination,
        is_holiday: false,
        is_vacation: false,
        is_absence: false,
      })
    }
    setSelectedDay(null)
  }

  const monthName = format(now, 'MMMM yyyy', { locale: pt })

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item} className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">
          {getGreeting()}, {user?.email?.split('@')[0]}
        </h1>
        <p className="text-muted-foreground">
          {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </motion.div>

      <motion.div variants={item}>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Competência Atual</p>
                <p className="text-2xl font-bold text-foreground capitalize">{monthName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Recebimento previsto</p>
                <p className="font-bold text-foreground">15 {format(addMonths(now, 1), 'MMMM', { locale: pt })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salário previsto</p>
                <p className="font-bold text-foreground">{formatEuro(weekEarnings.total * 4.33)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dias registrados</p>
                <p className="font-bold text-foreground">{registeredDays}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dias restantes</p>
                <p className="font-bold text-foreground">{daysLeft}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso da competência</span>
                <span className="font-medium text-foreground">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                Faltam {daysLeft} dias para encerrar a competência
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Salário Base</p>
                <p className="text-2xl font-bold text-foreground">{formatEuro(settings?.base_salary ?? 0)}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ganhos Semana</p>
                <p className="text-2xl font-bold text-foreground">{formatEuro(weekEarnings.total)}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Dias Trabalhados</p>
                <p className="text-2xl font-bold text-foreground">{daysWorked}/5</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Briefcase className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Dias Restantes</p>
                <p className="text-2xl font-bold text-foreground">{Math.max(0, daysRemaining)}</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Semana Atual</CardTitle>
              <Badge variant="secondary">Semana {displayWeek?.week_number ?? '-'}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Destino</p>
                    <p className="font-medium text-foreground">{displayWeek?.destination ?? 'Não definido'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Período</p>
                    <p className="font-medium text-foreground">
                      {format(weekStart, "d MMM", { locale: pt })} - {format(weekEnd, "d MMM yyyy", { locale: pt })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {DAY_LABELS.map((day, index) => {
                  const dayDate = new Date(weekStart)
                  dayDate.setDate(dayDate.getDate() + index)
                  const dateStr = format(dayDate, 'yyyy-MM-dd')
                  const workDay = getWorkDay(dateStr)
                  const isWorked = workDay?.worked ?? false
                  const isHoliday = workDay?.is_holiday ?? false
                  const isVacation = workDay?.is_vacation ?? false
                  const isAbsence = workDay?.is_absence ?? false
                  const isToday = format(now, 'yyyy-MM-dd') === dateStr
                  const isSelected = selectedDay === dateStr

                  let statusColor = 'bg-muted text-muted-foreground'
                  let statusIcon = null
                  if (isWorked) {
                    statusColor = 'bg-green-500/10 text-green-600 dark:text-green-400 ring-2 ring-green-500/20'
                    statusIcon = <Check className="w-3 h-3" />
                  } else if (isHoliday) {
                    statusColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                    statusIcon = <AlertCircle className="w-3 h-3" />
                  } else if (isVacation) {
                    statusColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                    statusIcon = <Plane className="w-3 h-3" />
                  } else if (isAbsence) {
                    statusColor = 'bg-red-500/10 text-red-600 dark:text-red-400 ring-2 ring-red-500/20'
                    statusIcon = <X className="w-3 h-3" />
                  }

                  return (
                    <div key={day} className="relative">
                      <button
                        onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                        className={`w-full p-3 rounded-xl text-center transition-all cursor-pointer hover:opacity-80 ${statusColor} ${isToday ? 'ring-2 ring-primary/40' : ''}`}
                      >
                        <p className="text-xs font-medium">{day}</p>
                        <p className="text-lg font-bold">{format(dayDate, 'd')}</p>
                        {statusIcon && <div className="flex justify-center mt-1">{statusIcon}</div>}
                        {workDay?.destination && isWorked && (
                          <p className="text-[10px] mt-0.5 opacity-70">{workDay.destination}</p>
                        )}
                      </button>

                      {isSelected && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 p-2 bg-card border border-border rounded-xl shadow-lg">
                          <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
                            {format(dayDate, "d 'de' MMMM", { locale: pt })}
                          </p>

                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Trabalho</p>
                            <div className="grid grid-cols-3 gap-1">
                              {CITY_OPTIONS.map(city => (
                                <button
                                  key={city}
                                  onClick={() => handleSetDestination(dateStr, city)}
                                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                    workDay?.destination === city && isWorked
                                      ? 'bg-green-500 text-white'
                                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                  }`}
                                >
                                  {city}
                                </button>
                              ))}
                            </div>

                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider pt-1">Outros</p>
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                onClick={() => handleSetAbsence(dateStr, 'holiday')}
                                className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                  isHoliday ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                              >
                                Feriado
                              </button>
                              <button
                                onClick={() => handleSetAbsence(dateStr, 'vacation')}
                                className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                  isVacation ? 'bg-blue-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                              >
                                Férias
                              </button>
                              <button
                                onClick={() => handleSetAbsence(dateStr, 'absence')}
                                className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                  isAbsence ? 'bg-red-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                              >
                                Falta
                              </button>
                            </div>

                            {(isWorked || isHoliday || isVacation || isAbsence) && (
                              <button
                                onClick={() => handleClearDay(dateStr)}
                                className="w-full px-2 py-1.5 rounded text-xs font-medium bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors mt-1"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Resumo - {monthName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {weekEarnings.breakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{item.rule_name}</span>
                    <span className={`text-sm font-medium ${
                      item.amount >= 0 ? 'text-green-600 dark:text-green-40' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {item.amount >= 0 ? '+' : ''}€{item.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Total Semana</span>
                  <span className="text-xl font-bold text-foreground">{formatEuro(weekEarnings.total)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span className="text-foreground font-medium">Dia 15 de cada mês</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Próximo recebimento</span>
                  <span className="text-foreground font-medium">15 {format(addMonths(now, 1), 'MMMM', { locale: pt })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
