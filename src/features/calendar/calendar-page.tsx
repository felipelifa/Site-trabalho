import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, MapPin, Home } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWorkDaysByMonth } from '@/hooks/use-queries'
import { isNationalHoliday, getHolidayName } from '@/utils/holidays'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const { data: workDays = [] } = useWorkDaysByMonth(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1
  )

  const workDaysMap = useMemo(() => {
    const map = new Map<string, typeof workDays[0]>()
    workDays.forEach(day => map.set(day.date, day))
    return map
  }, [workDays])

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const workDay = workDaysMap.get(dateStr)

    if (isNationalHoliday(date)) {
      return { type: 'holiday', label: getHolidayName(date) }
    }
    if (workDay?.is_vacation) {
      return { type: 'vacation', label: 'Férias' }
    }
    if (workDay?.is_absence) {
      return { type: 'absence', label: 'Falta' }
    }
    if (workDay?.worked) {
      return { type: 'worked', label: workDay.destination || 'Trabalhou' }
    }
    if (date.getDay() === 0 || date.getDay() === 6) {
      return { type: 'weekend', label: 'Fim de semana' }
    }
    return { type: 'none', label: '' }
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'worked':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      case 'holiday':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      case 'vacation':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'absence':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      case 'weekend':
        return 'bg-muted text-muted-foreground border-border'
      default:
        return 'bg-background border-border hover:bg-muted'
    }
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
          <h1 className="text-3xl font-bold text-foreground">Calendário</h1>
          <p className="text-muted-foreground">Visualize seus dias de trabalho</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium text-foreground min-w-[180px] text-center">
            {format(currentDate, "MMMM 'de' yyyy", { locale: pt })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, index) => (
                <div key={`empty-${index}`} />
              ))}

              {days.map((date) => {
                const status = getDayStatus(date)
                const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                const isPast = isBefore(date, new Date()) && !isToday(date)

                return (
                  <motion.button
                    key={date.toISOString()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(date)}
                    className={`relative p-3 rounded-xl border transition-all ${getStatusColor(status.type)} ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    } ${isPast ? 'opacity-60' : ''}`}
                  >
                    <span className="text-sm font-medium">{format(date, 'd')}</span>
                    {status.type === 'worked' && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                        <MapPin className="w-3 h-3" />
                      </div>
                    )}
                    {status.type === 'holiday' && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                        <Home className="w-3 h-3" />
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const status = getDayStatus(selectedDate)
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={status.type === 'worked' ? 'default' : 'secondary'}>
                        {status.label || 'Não registrado'}
                      </Badge>
                    </div>
                    {status.type === 'worked' && workDaysMap.get(format(selectedDate, 'yyyy-MM-dd')) && (
                      <>
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                          <span className="text-sm text-muted-foreground">Destino</span>
                          <span className="text-sm font-medium text-foreground">
                            {workDaysMap.get(format(selectedDate, 'yyyy-MM-dd'))?.destination || '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                          <span className="text-sm text-muted-foreground">Dormiu fora</span>
                          <span className="text-sm font-medium text-foreground">
                            {workDaysMap.get(format(selectedDate, 'yyyy-MM-dd'))?.slept_away ? 'Sim' : 'Não'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Legenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30" />
                <span className="text-sm text-muted-foreground">Trabalhou</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30" />
                <span className="text-sm text-muted-foreground">Feriado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30" />
                <span className="text-sm text-muted-foreground">Férias</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
                <span className="text-sm text-muted-foreground">Falta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted border border-border" />
                <span className="text-sm text-muted-foreground">Fim de semana</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
