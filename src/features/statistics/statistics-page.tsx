import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts'
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown, MapPin, Calendar, Target, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkWeeks, useWorkDaysByYear, useSalaryRules } from '@/hooks/use-queries'
import { calculateMonthEarnings } from '@/utils/rules-engine'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatEuro(value: number): string {
  return `€${Math.abs(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { semanas: number; dias: number } }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 min-w-[160px]">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-primary">{formatEuro(payload[0].value)}</p>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
        <span>{payload[0].payload.semanas} semanas</span>
        <span>·</span>
        <span>{payload[0].payload.dias} dias</span>
      </div>
    </div>
  )
}

export function StatisticsPage() {
  const { data: workWeeks = [] } = useWorkWeeks()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  const { data: yearWorkDays = [] } = useWorkDaysByYear(selectedYear)
  const { data: rules = [] } = useSalaryRules()

  const yearWeeks = useMemo(() => {
    return workWeeks.filter(w => new Date(w.start_date).getFullYear() === selectedYear)
  }, [workWeeks, selectedYear])

  const monthlyData = useMemo(() => {
    return MONTHS_SHORT.map((_month, index) => {
      const monthNum = index + 1
      const monthWorkDays = yearWorkDays.filter(d => {
        const date = new Date(d.date)
        return date.getMonth() + 1 === monthNum
      })
      const monthWeeks = yearWeeks.filter(w => new Date(w.start_date).getMonth() === index)
      const calc = monthWorkDays.length > 0
        ? calculateMonthEarnings(monthWorkDays, rules)
        : { total: 0, breakdown: [] }
      return {
        name: MONTHS_SHORT[index],
        fullName: MONTHS_FULL[index],
        valor: calc.total,
        semanas: monthWeeks.length,
        dias: monthWorkDays.filter(d => d.worked).length,
        absences: monthWorkDays.filter(d => d.is_absence).length,
        saturdays: monthWorkDays.filter(d => new Date(d.date).getDay() === 6 && d.worked).length,
      }
    })
  }, [yearWorkDays, yearWeeks, rules])

  const filteredMonthlyData = useMemo(() => {
    if (selectedMonth === null) return monthlyData
    return [monthlyData[selectedMonth]]
  }, [monthlyData, selectedMonth])

  const cityData = useMemo(() => {
    const cities: Record<string, { weeks: number; earned: number; days: number }> = {}
    const filteredDays = selectedMonth !== null
      ? yearWorkDays.filter(d => new Date(d.date).getMonth() + 1 === selectedMonth + 1)
      : yearWorkDays
    const filteredWeeks = selectedMonth !== null
      ? yearWeeks.filter(w => new Date(w.start_date).getMonth() === selectedMonth)
      : yearWeeks

    filteredWeeks.forEach(week => {
      const city = week.destination || 'Não definido'
      if (!cities[city]) cities[city] = { weeks: 0, earned: 0, days: 0 }
      cities[city].weeks++
    })
    filteredDays.forEach(day => {
      const city = day.destination || 'Não definido'
      if (cities[city] && day.worked) cities[city].days++
    })
    Object.keys(cities).forEach(city => {
      const cityDays = filteredDays.filter(d => d.destination === city && d.worked)
      const calc = cityDays.length > 0 ? calculateMonthEarnings(cityDays, rules) : { total: 0 }
      cities[city].earned = calc.total
    })
    return Object.entries(cities).map(([name, data]) => ({ name, ...data }))
  }, [yearWeeks, yearWorkDays, rules, selectedMonth])

  const stats = useMemo(() => {
    const filteredDays = selectedMonth !== null
      ? yearWorkDays.filter(d => new Date(d.date).getMonth() + 1 === selectedMonth + 1)
      : yearWorkDays
    const filteredWeeks = selectedMonth !== null
      ? yearWeeks.filter(w => new Date(w.start_date).getMonth() === selectedMonth)
      : yearWeeks

    const calc = filteredDays.length > 0
      ? calculateMonthEarnings(filteredDays, rules)
      : { total: 0, breakdown: [] }
    const totalEarned = calc.total
    const totalWeeks = filteredWeeks.length
    const averagePerWeek = totalWeeks > 0 ? totalEarned / totalWeeks : 0
    const workedDays = filteredDays.filter(d => d.worked).length
    const saturdays = filteredDays.filter(d => new Date(d.date).getDay() === 6 && d.worked).length
    const absences = filteredDays.filter(d => d.is_absence).length
    const vacations = filteredDays.filter(d => d.is_vacation).length

    return {
      totalEarned, totalWeeks, averagePerWeek,
      workedDays, saturdays, absences, vacations,
      breakdown: calc.breakdown,
    }
  }, [yearWorkDays, yearWeeks, rules, selectedMonth])

  const yearlyComparison = useMemo(() => {
    const prevYear = selectedYear - 1
    const prevYearWeeks = workWeeks.filter(w => new Date(w.start_date).getFullYear() === prevYear)
    const prevTotal = prevYearWeeks.reduce((sum, w) => sum + (w.total_earned || 0), 0)
    const diff = stats.totalEarned - prevTotal
    const pct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0
    return { diff, pct, positive: diff >= 0, prevTotal }
  }, [stats, selectedYear, workWeeks])

  const periodLabel = selectedMonth !== null ? `${MONTHS_FULL[selectedMonth]} ${selectedYear}` : `${selectedYear}`

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 lg:space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Estatísticas</h1>
          <p className="text-sm md:text-base text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowMonthPicker(!showMonthPicker)} className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {selectedMonth !== null ? MONTHS_SHORT[selectedMonth] : 'Todos os meses'}
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showMonthPicker && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-1 right-0 z-50 bg-card border border-border rounded-xl shadow-xl p-2 min-w-[180px]">
                <button onClick={() => { setSelectedMonth(null); setShowMonthPicker(false) }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${selectedMonth === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  Todos os meses
                </button>
                {MONTHS_SHORT.map((_m, i) => (
                  <button key={i} onClick={() => { setSelectedMonth(i); setShowMonthPicker(false) }}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${selectedMonth === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                    {MONTHS_FULL[i]}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedYear(y => y - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[50px] text-center">{selectedYear}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= currentYear}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Ganho</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-foreground">{formatEuro(stats.totalEarned)}</p>
            {yearlyComparison.prevTotal > 0 && selectedMonth === null && (
              <div className="flex items-center gap-1 mt-1">
                {yearlyComparison.positive ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                <span className={`text-[10px] font-medium ${yearlyComparison.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {yearlyComparison.positive ? '+' : ''}{yearlyComparison.pct}% vs {selectedYear - 1}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Média Semanal</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-foreground">{formatEuro(stats.averagePerWeek)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Dias Trabalhados</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{stats.workedDays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Total Semanas</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-foreground">{stats.totalWeeks}</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <span className="text-xs text-muted-foreground">Sábados</span>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.saturdays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <span className="text-xs text-muted-foreground">Faltas</span>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.absences}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <span className="text-xs text-muted-foreground">Férias</span>
            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{stats.vacations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <span className="text-xs text-muted-foreground">Média Diária</span>
            <p className="text-lg font-bold text-foreground">
              {stats.workedDays > 0 ? formatEuro(stats.totalEarned / stats.workedDays) : '€0'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="monthly" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="monthly">Ganhos Mensais</TabsTrigger>
              <TabsTrigger value="cities">Cidades</TabsTrigger>
              <TabsTrigger value="trends">Tendências</TabsTrigger>
              <TabsTrigger value="breakdown">Composição</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="monthly">
            <Card>
              <CardContent className="p-4">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredMonthlyData} barSize={selectedMonth !== null ? 60 : undefined}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                      <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `€${v}`} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                      <Bar dataKey="valor" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cities">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground mb-4">Distribuição por Cidade</p>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={cityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="earned"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                          {cityData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(value) => [formatEuro(Number(value)), 'Ganho']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Resumo por Cidade</p>
                  {cityData.map((city) => (
                    <div key={city.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{city.name}</span>
                        <span className="text-sm font-medium text-foreground">{formatEuro(city.earned)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{city.weeks} semanas · {city.days} dias</span>
                        <span className="text-xs text-muted-foreground">
                          {city.days > 0 ? formatEuro(city.earned / city.days) : '€0'}/dia
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${city.name === 'Porto' ? 'bg-green-500' : city.name === 'Lisboa' ? 'bg-blue-500' : 'bg-purple-500'}`}
                          style={{ width: `${(city.earned / Math.max(...cityData.map(c => c.earned))) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-t mt-2">
                    <span className="text-sm font-medium text-foreground">Total</span>
                    <span className="font-bold text-foreground">{formatEuro(stats.totalEarned)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardContent className="p-4">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                      <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `€${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#areaGradient)" dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--primary))' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Composição do Salário</p>
                  {stats.breakdown.length > 0 ? (
                    stats.breakdown.map((b, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex-1">
                          <span className="text-sm text-foreground">{b.rule_name}</span>
                          <p className="text-[10px] text-muted-foreground">{b.reason}</p>
                        </div>
                        <span className={`text-sm font-bold ${b.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {b.amount >= 0 ? '+' : ''}{formatEuro(b.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                  )}
                  {stats.breakdown.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border-t border-primary/20">
                      <span className="text-sm font-medium text-foreground">Total</span>
                      <span className="text-lg font-bold text-foreground">{formatEuro(stats.totalEarned)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Resumo {periodLabel}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Semanas', value: stats.totalWeeks, color: 'text-foreground' },
                      { label: 'Dias Trabalhados', value: stats.workedDays, color: 'text-green-600 dark:text-green-400' },
                      { label: 'Sábados', value: stats.saturdays, color: 'text-orange-600 dark:text-orange-400' },
                      { label: 'Faltas', value: stats.absences, color: 'text-red-600 dark:text-red-400' },
                      { label: 'Férias', value: stats.vacations, color: 'text-yellow-600 dark:text-yellow-400' },
                      { label: 'Média/Semana', value: formatEuro(stats.averagePerWeek), color: 'text-foreground' },
                    ].map((stat, i) => (
                      <div key={i} className="p-2.5 bg-muted/50 rounded-lg">
                        <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                        <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
