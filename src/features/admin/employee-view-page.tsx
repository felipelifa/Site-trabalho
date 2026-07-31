import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  MapPin,
  Building2,
  Map,
  Users,
  Car,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Plane,
  AlertTriangle,
} from 'lucide-react'
import { format, eachDayOfInterval, getISOWeek, startOfWeek, endOfWeek } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  useTeams,
  useAllOperations,
  useEmployees,
  useUpsertDailyRecord,
} from '@/hooks/use-admin-queries'
import { useAuthContext } from '@/hooks/use-auth-context'
import { cn } from '@/lib/utils'

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

type DayStatus = 'worked' | 'absence' | 'justified' | 'vacation'

interface WeekInfo {
  weekNumber: number
  year: number
  days: Date[]
  start: Date
  end: Date
}

export function EmployeeViewPage() {
  const { user } = useAuthContext()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedDay, setSelectedDay] = useState<string | null>(format(now, 'yyyy-MM-dd'))
  const [expandedWeek, setExpandedWeek] = useState<number | null>(getISOWeek(now))

  const { data: teams = [] } = useTeams()
  const { data: employees = [] } = useEmployees()
  const { data: allOperations = [] } = useAllOperations()
  const upsertRecord = useUpsertDailyRecord()

  const currentUserEmployee = useMemo(() => {
    return employees.find(e => e.user_id === user?.id)
  }, [employees, user])

  const weeks = useMemo((): WeekInfo[] => {
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1)
    const monthEnd = new Date(selectedYear, selectedMonth, 0)
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const weekMap = new Map()

    for (const day of allDays) {
      const weekNum = getISOWeek(day)
      if (!weekMap.has(weekNum)) {
        const weekStart = startOfWeek(day, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(day, { weekStartsOn: 1 })
        weekMap.set(weekNum, {
          weekNumber: weekNum,
          year: weekStart.getFullYear(),
          days: [],
          start: weekStart,
          end: weekEnd,
        })
      }
      weekMap.get(weekNum)!.days.push(day)
    }

    return Array.from(weekMap.values())
  }, [selectedYear, selectedMonth])

  const myWeeks = useMemo(() => {
    if (!currentUserEmployee) return []

    return weeks.map(week => {
      const weekOps = allOperations.filter(op => {
        if (op.year !== week.year || op.week_number !== week.weekNumber) return false
        if (op.status !== 'published') return false
        const team = teams.find(t => t.id === op.team_id)
        if (!team) return false
        const members = (team as unknown as { members?: Array<{ employee?: { id?: string } }> }).members || []
        return members.some(m => m.employee?.id === currentUserEmployee.id)
      })

      const enrichedOps = weekOps.map(op => {
        const team = teams.find(t => t.id === op.team_id)
        const leader = employees.find(e => e.id === op.leader_id)
        const vehicle = (op as unknown as { vehicle?: { name?: string; license_plate?: string } }).vehicle
        return {
          ...op,
          team,
          leader: leader ? { full_name: leader.full_name } : null,
          vehicle: vehicle || null,
        }
      })

      return { ...week, operations: enrichedOps }
    }).filter(w => w.operations.length > 0)
  }, [weeks, allOperations, teams, employees, currentUserEmployee])

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(y => y - 1)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(y => y + 1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  const handleDayStatus = (dateStr: string, status: DayStatus) => {
    if (!currentUserEmployee) return
    const base = {
      employee_id: currentUserEmployee.id,
      date: dateStr,
    }

    switch (status) {
      case 'worked':
        upsertRecord.mutate({ ...base, confirmed_presence: true, work_started: true, work_ended: true })
        break
      case 'absence':
        upsertRecord.mutate({ ...base, confirmed_presence: false, work_started: false, work_ended: false })
        break
      case 'justified':
        upsertRecord.mutate({ ...base, confirmed_presence: false, work_started: false, work_ended: false, notes: 'falta justificada' })
        break
      case 'vacation':
        upsertRecord.mutate({ ...base, confirmed_presence: false, work_started: false, work_ended: false })
        break
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-4"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Minha Agenda</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: pt })}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {myWeeks.length === 0 ? (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Nenhuma operação atribuída para {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: pt })}.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        myWeeks.map((week) => {
          const isExpanded = expandedWeek === week.weekNumber
          return (
            <motion.div key={week.weekNumber} variants={item}>
              <Card className="overflow-hidden">
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : week.weekNumber)}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-primary">S{week.weekNumber}</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {format(week.start, 'dd MMM', { locale: pt })} - {format(week.end, 'dd MMM', { locale: pt })}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {week.operations.map(op => (
                            <Badge
                              key={op.id}
                              variant="secondary"
                              className="text-xs"
                              style={{
                                backgroundColor: ((op.team as { color?: string } | null)?.color || '#3B82F6') + '20',
                                color: (op.team as { color?: string } | null)?.color || '#3B82F6',
                              }}
                            >
                              {(op.team as { name?: string } | null)?.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {week.operations.map(op => {
                      const team = op.team as { name?: string; color?: string } | null
                      const leader = op.leader as { full_name?: string } | null
                      const vehicle = op.vehicle as { name?: string; license_plate?: string } | null
                      return (
                        <div key={op.id} className="p-4 border-b border-border last:border-b-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: team?.color || '#3B82F6' }}
                            >
                              {team?.name?.charAt(0) || 'E'}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{team?.name || 'Equipe'}</p>
                              <Badge variant="default" className="text-xs mt-0.5">Publicada</Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Destino</p>
                                <p className="font-medium text-foreground">{op.destination}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Empresa</p>
                                <p className="font-medium text-foreground">{op.company_name || '-'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Map className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Local</p>
                                <p className="font-medium text-foreground">{op.company_location || '-'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Responsável</p>
                                <p className="font-medium text-foreground">{leader?.full_name || '-'}</p>
                              </div>
                            </div>
                            {vehicle && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <Car className="w-3.5 h-3.5 text-muted-foreground" />
                                <div>
                                  <p className="text-muted-foreground">Veículo</p>
                                  <p className="font-medium text-foreground">
                                    {vehicle.name}
                                    {vehicle.license_plate && ` (${vehicle.license_plate})`}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {op.notes && (
                            <p className="text-xs text-muted-foreground mb-3">📝 {op.notes}</p>
                          )}

                          <div className="grid grid-cols-7 gap-1">
                            {week.days.map(day => {
                              const dateStr = format(day, 'yyyy-MM-dd')
                              const isToday = format(now, 'yyyy-MM-dd') === dateStr
                              const isSelected = selectedDay === dateStr
                              const dow = day.getDay()
                              const dayLabel = format(day, 'EEE', { locale: pt })
                              const dayNum = format(day, 'd')

                              return (
                                <button
                                  key={dateStr}
                                  onClick={() => setSelectedDay(dateStr)}
                                  className={cn(
                                    "flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-xs transition-all",
                                    isSelected ? "bg-primary text-primary-foreground" :
                                    isToday ? "bg-primary/10 text-primary font-bold" :
                                    "hover:bg-muted text-foreground",
                                    dow === 0 || dow === 6 ? "text-muted-foreground" : ""
                                  )}
                                >
                                  <span className="text-[10px] uppercase">{dayLabel}</span>
                                  <span className="font-medium">{dayNum}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    {selectedDay && (() => {
                      const dayDate = new Date(selectedDay + 'T12:00:00')
                      const dayMonth = dayDate.getMonth() + 1
                      const dayYear = dayDate.getFullYear()
                      if (dayMonth !== selectedMonth || dayYear !== selectedYear) return null

                      return (
                        <div className="p-4 border-t border-border bg-muted/20">
                          <p className="text-xs text-muted-foreground mb-2 capitalize">
                            {format(dayDate, "EEEE, d 'de' MMMM", { locale: pt })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleDayStatus(selectedDay, 'worked')}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Trabalhou
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDayStatus(selectedDay, 'absence')}>
                              Falta
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDayStatus(selectedDay, 'justified')}>
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                              Falta Justificada
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDayStatus(selectedDay, 'vacation')}>
                              <Plane className="w-3.5 h-3.5 mr-1" />
                              Férias
                            </Button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </Card>
            </motion.div>
          )
        })
      )}
    </motion.div>
  )
}
