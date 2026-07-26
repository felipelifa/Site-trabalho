import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  XCircle,
} from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfWeek, endOfWeek } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useWorkDaysByMonth, useWorkDaysByMonth as usePrevMonth } from '@/hooks/use-queries'
import { isNationalHoliday, isFafeMunicipalHoliday, getHolidayName } from '@/utils/holidays'
import { calculateDayEarnings } from '@/utils/rules-engine'

type FilterType = 'all' | 'worked' | 'saturday' | 'holiday' | 'absence' | 'vacation' | 'porto' | 'lisboa' | 'algarve' | 'pending'

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  worked: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: '🟢', label: 'Trabalhou' },
  saturday: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: '🟠', label: 'Sábado' },
  holiday: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: '🎉', label: 'Feriado' },
  vacation: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: '✈️', label: 'Férias' },
  absence: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: '❌', label: 'Falta' },
  weekend: { color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', icon: '⚪', label: 'Fim de semana' },
  pending: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '🟡', label: 'Pendente' },
  none: { color: 'text-muted-foreground', bg: 'bg-background', border: 'border-border', icon: '', label: '' },
}

function formatEuro(value: number): string {
  return `€${Math.abs(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const prevMonth = subMonths(currentDate, 1)
  const prevMonthYear = prevMonth.getFullYear()
  const prevMonthNum = prevMonth.getMonth() + 1

  const { data: workDays = [] } = useWorkDaysByMonth(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1
  )
  const { data: prevWorkDays = [] } = usePrevMonth(prevMonthYear, prevMonthNum)

  const workDaysMap = useMemo(() => {
    const map = new Map<string, typeof workDays[0]>()
    workDays.forEach(day => map.set(day.date, day))
    return map
  }, [workDays])

  const getDayInfo = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const workDay = workDaysMap.get(dateStr)
    const isHol = isNationalHoliday(date) || isFafeMunicipalHoliday(date)
    const holName = getHolidayName(date)
    const dow = date.getDay()
    const isSat = dow === 6
    const isSun = dow === 0

    let status = 'none'
    if (isHol && workDay?.worked) status = 'holiday'
    else if (isHol) status = 'holiday'
    else if (workDay?.is_vacation) status = 'vacation'
    else if (workDay?.is_absence) status = 'absence'
    else if (isSat && workDay?.worked) status = 'saturday'
    else if (workDay?.worked) status = 'worked'
    else if (isSat || isSun) status = 'weekend'
    else if (isBefore(date, new Date()) && !isToday(date)) status = 'pending'
    else status = 'none'

    let earned = 0
    if (workDay) {
      const calc = calculateDayEarnings(
        {
          id: workDay.id || '',
          user_id: '',
          week_id: '',
          date: workDay.date,
          day_of_week: workDay.day_of_week,
          worked: workDay.worked,
          destination: workDay.destination || '',
          slept_away: workDay.slept_away ?? false,
          is_holiday: workDay.is_holiday,
          is_vacation: workDay.is_vacation,
          is_absence: workDay.is_absence,
          absence_type: workDay.absence_type || '',
          earned: 0,
          notes: workDay.notes || '',
          created_at: '',
          updated_at: '',
        } as never,
        [],
        date
      )
      earned = calc.total
    }

    return {
      status,
      destination: workDay?.destination || null,
      earned,
      notes: workDay?.notes || null,
      holName,
      sleptAway: workDay?.slept_away ?? false,
    }
  }

  const filteredDays = useMemo(() => {
    if (activeFilter === 'all') return days
    return days.filter(date => {
      const info = getDayInfo(date)
      switch (activeFilter) {
        case 'worked': return info.status === 'worked'
        case 'saturday': return info.status === 'saturday'
        case 'holiday': return info.status === 'holiday'
        case 'absence': return info.status === 'absence'
        case 'vacation': return info.status === 'vacation'
        case 'porto': return info.destination === 'Porto'
        case 'lisboa': return info.destination === 'Lisboa'
        case 'algarve': return info.destination === 'Algarve'
        case 'pending': return info.status === 'pending'
        default: return true
      }
    })
  }, [days, activeFilter, workDays])

  const monthStats = useMemo(() => {
    let worked = 0, satWorked = 0, holidays = 0, absences = 0, vacations = 0, pending = 0
    let totalEarned = 0
    const cities: Record<string, number> = { Porto: 0, Lisboa: 0, Algarve: 0 }

    days.forEach(date => {
      const info = getDayInfo(date)
      if (info.status === 'worked') worked++
      if (info.status === 'saturday') satWorked++
      if (info.status === 'holiday') holidays++
      if (info.status === 'absence') absences++
      if (info.status === 'vacation') vacations++
      if (info.status === 'pending') pending++
      totalEarned += info.earned
      if (info.destination && info.destination in cities) {
        cities[info.destination]++
      }
    })

    const prevTotal = prevWorkDays.reduce((sum, d) => {
      const calc = calculateDayEarnings(
        {
          id: d.id || '', user_id: '', week_id: '', date: d.date,
          day_of_week: d.day_of_week, worked: d.worked,
          destination: d.destination || '', slept_away: d.slept_away ?? false,
          is_holiday: d.is_holiday, is_vacation: d.is_vacation,
          is_absence: d.is_absence, absence_type: d.absence_type || '',
          earned: 0, notes: d.notes || '', created_at: '', updated_at: '',
        } as never,
        [],
        new Date(d.date)
      )
      return sum + calc.total
    }, 0)

    return { worked, satWorked, holidays, absences, vacations, pending, totalEarned, prevTotal, cities }
  }, [days, workDays, prevWorkDays])

  const weekGroups = useMemo(() => {
    const groups: { weekStart: Date; weekEnd: Date; days: Date[]; total: number; destination: string | null }[] = []
    let currentWeekStart = startOfWeek(days[0] || new Date(), { weekStartsOn: 1 })
    let currentWeekDays: Date[] = []
    let weekTotal = 0
    let weekDest: string | null = null

    days.forEach(date => {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      if (weekStart.getTime() !== currentWeekStart.getTime()) {
        if (currentWeekDays.length > 0) {
          groups.push({
            weekStart: currentWeekStart,
            weekEnd: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
            days: currentWeekDays,
            total: weekTotal,
            destination: weekDest,
          })
        }
        currentWeekStart = weekStart
        currentWeekDays = []
        weekTotal = 0
        weekDest = null
      }
      currentWeekDays.push(date)
      const info = getDayInfo(date)
      weekTotal += info.earned
      if (info.destination) weekDest = info.destination
    })

    if (currentWeekDays.length > 0) {
      groups.push({
        weekStart: currentWeekStart,
        weekEnd: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
        days: currentWeekDays,
        total: weekTotal,
        destination: weekDest,
      })
    }

    return groups
  }, [days, workDays])

  const comparison = useMemo(() => {
    const diff = monthStats.totalEarned - monthStats.prevTotal
    const pct = monthStats.prevTotal > 0 ? Math.round((diff / monthStats.prevTotal) * 100) : 0
    return { diff, pct, positive: diff >= 0 }
  }, [monthStats])

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'worked', label: 'Trabalho' },
    { key: 'saturday', label: 'Sábados' },
    { key: 'holiday', label: 'Feriados' },
    { key: 'absence', label: 'Faltas' },
    { key: 'vacation', label: 'Férias' },
    { key: 'porto', label: 'Porto' },
    { key: 'lisboa', label: 'Lisboa' },
    { key: 'algarve', label: 'Algarve' },
    { key: 'pending', label: 'Pendentes' },
  ]

  const selectedInfo = selectedDate ? getDayInfo(selectedDate) : null

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="flex-1 space-y-4">
        <motion.div variants={item} initial="hidden" animate="show" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Calendário</h1>
            <p className="text-sm md:text-base text-muted-foreground capitalize">
              {format(currentDate, "MMMM 'de' yyyy", { locale: pt })}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeFilter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show">
          <Card>
            <CardContent className="p-2 sm:p-4">
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                {DAY_LABELS.map(day => (
                  <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {days.map(date => {
                  const info = getDayInfo(date)
                  const config = STATUS_CONFIG[info.status] || STATUS_CONFIG.none
                  const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                  const today = isToday(date)
                  const dateNum = date.getDate()
                  const isFiltered = activeFilter !== 'all' && !filteredDays.includes(date)

                  return (
                    <motion.button
                      key={date.toISOString()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDate(isSelected ? null : date)}
                      className={`relative p-1 sm:p-1.5 rounded-lg border transition-all text-left ${
                        isFiltered ? 'opacity-20' : ''
                      } ${config.bg} ${config.border} ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      } ${today ? 'ring-2 ring-primary/40' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold text-foreground">{dateNum}</span>
                        {info.status === 'pending' && (
                          <span className="text-[8px]">🟡</span>
                        )}
                      </div>
                      <div className="hidden sm:block mt-0.5">
                        {info.status !== 'none' && info.status !== 'weekend' && (
                          <span className="text-[8px] sm:text-[9px] leading-tight block truncate">
                            {config.icon} {info.destination || config.label}
                          </span>
                        )}
                        {info.earned !== 0 && (
                          <span className={`text-[8px] sm:text-[9px] font-bold block ${
                            info.earned > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {info.earned > 0 ? '+' : ''}{formatEuro(info.earned)}
                          </span>
                        )}
                      </div>
                      <div className="sm:hidden mt-0.5 flex justify-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          info.status === 'worked' ? 'bg-green-500' :
                          info.status === 'saturday' ? 'bg-orange-500' :
                          info.status === 'holiday' ? 'bg-blue-500' :
                          info.status === 'vacation' ? 'bg-yellow-500' :
                          info.status === 'absence' ? 'bg-red-500' :
                          info.status === 'pending' ? 'bg-yellow-400' :
                          'bg-transparent'
                        }`} />
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {weekGroups.map((group, i) => (
          <motion.div
            key={i}
            variants={item}
            initial="hidden"
            animate="show"
            className="flex items-center justify-between px-1"
          >
            <div className="flex items-center gap-2">
              {group.destination && (
                <span className="text-xs text-muted-foreground">
                  📍 Semana {group.destination}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-foreground">
              Total: <span className="text-green-600 dark:text-green-400">{formatEuro(group.total)}</span>
            </span>
          </motion.div>
        ))}

        <AnimatePresence>
          {selectedDate && selectedInfo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">
                      {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
                    </h3>
                    <button onClick={() => setSelectedDate(null)} className="p-1 rounded hover:bg-muted">
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <span>{STATUS_CONFIG[selectedInfo.status]?.icon}</span>
                      <span className="text-muted-foreground">{STATUS_CONFIG[selectedInfo.status]?.label || 'Sem registo'}</span>
                    </div>
                    {selectedInfo.destination && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{selectedInfo.destination}</span>
                      </div>
                    )}
                    {selectedInfo.earned !== 0 && (
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${selectedInfo.earned > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className={`font-medium ${selectedInfo.earned > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {selectedInfo.earned > 0 ? '+' : ''}{formatEuro(selectedInfo.earned)}
                        </span>
                      </div>
                    )}
                    {selectedInfo.sleptAway && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <span>🏠</span>
                        <span className="text-muted-foreground">Dormiu fora</span>
                      </div>
                    )}
                  </div>
                  {selectedInfo.notes && (
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">📝 {selectedInfo.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="lg:w-72 xl:w-80 shrink-0 space-y-4">
        <div className="lg:sticky lg:top-20 space-y-4">
          <motion.div variants={item} initial="hidden" animate="show">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Ganhos do Mês</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatEuro(monthStats.totalEarned)}</p>
                <div className="flex items-center gap-1">
                  {comparison.positive ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${comparison.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {comparison.positive ? '+' : ''}{formatEuro(comparison.diff)} vs mês anterior
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} initial="hidden" animate="show">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-foreground mb-2">Resumo do Mês</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Dias Trabalhados', value: monthStats.worked, color: 'text-green-600 dark:text-green-400' },
                    { label: 'Sábados', value: monthStats.satWorked, color: 'text-orange-600 dark:text-orange-400' },
                    { label: 'Feriados', value: monthStats.holidays, color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Férias', value: monthStats.vacations, color: 'text-yellow-600 dark:text-yellow-400' },
                    { label: 'Faltas', value: monthStats.absences, color: 'text-red-600 dark:text-red-400' },
                    ...(monthStats.pending > 0 ? [{ label: 'Pendentes', value: monthStats.pending, color: 'text-yellow-500' }] : []),
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <span className={`text-xs font-bold ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} initial="hidden" animate="show">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-foreground mb-2">Ganhos por Destino</p>
                {Object.entries(monthStats.cities).filter(([, v]) => v > 0).map(([city, days]) => (
                  <div key={city} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{city}</span>
                      <span className="text-xs font-medium text-foreground">{days} dias</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          city === 'Porto' ? 'bg-green-500' : city === 'Lisboa' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${(days / Math.max(...Object.values(monthStats.cities))) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} initial="hidden" animate="show">
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Legenda</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { icon: '🟢', label: 'Trabalhou', color: 'bg-green-500' },
                    { icon: '🟠', label: 'Sábado', color: 'bg-orange-500' },
                    { icon: '🎉', label: 'Feriado', color: 'bg-blue-500' },
                    { icon: '✈️', label: 'Férias', color: 'bg-yellow-500' },
                    { icon: '❌', label: 'Falta', color: 'bg-red-500' },
                    { icon: '🟡', label: 'Pendente', color: 'bg-yellow-400' },
                  ].map((legend, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${legend.color}`} />
                      <span className="text-[10px] text-muted-foreground">{legend.icon} {legend.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
