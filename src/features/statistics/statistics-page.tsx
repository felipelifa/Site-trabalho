import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown, MapPin, Calendar, Target } from 'lucide-react'
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

function formatEuro(value: number): string {
  return `€${Math.abs(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function StatisticsPage() {
  const { data: workWeeks = [] } = useWorkWeeks()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const { data: yearWorkDays = [] } = useWorkDaysByYear(selectedYear)
  const { data: rules = [] } = useSalaryRules()

  const yearWeeks = useMemo(() => {
    return workWeeks.filter(w => new Date(w.start_date).getFullYear() === selectedYear)
  }, [workWeeks, selectedYear])

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return months.map((month, index) => {
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
        name: month,
        valor: calc.total,
        semanas: monthWeeks.length,
        dias: monthWorkDays.filter(d => d.worked).length,
      }
    })
  }, [yearWorkDays, yearWeeks, rules])

  const cityData = useMemo(() => {
    const cities: Record<string, { weeks: number; earned: number; days: number }> = {}
    yearWeeks.forEach(week => {
      const city = week.destination || 'Não definido'
      if (!cities[city]) cities[city] = { weeks: 0, earned: 0, days: 0 }
      cities[city].weeks++
    })
    yearWorkDays.forEach(day => {
      const city = day.destination || 'Não definido'
      if (cities[city]) {
        if (day.worked) cities[city].days++
      }
    })
    Object.keys(cities).forEach(city => {
      const cityDays = yearWorkDays.filter(d => d.destination === city && d.worked)
      const calc = cityDays.length > 0 ? calculateMonthEarnings(cityDays, rules) : { total: 0 }
      cities[city].earned = calc.total
    })
    return Object.entries(cities).map(([name, data]) => ({
      name, ...data,
    }))
  }, [yearWeeks, yearWorkDays, rules])

  const stats = useMemo(() => {
    const calc = yearWorkDays.length > 0
      ? calculateMonthEarnings(yearWorkDays, rules)
      : { total: 0, breakdown: [] }
    const totalEarned = calc.total
    const totalWeeks = yearWeeks.length
    const averagePerWeek = totalWeeks > 0 ? totalEarned / totalWeeks : 0

    const workedDays = yearWorkDays.filter(d => d.worked).length
    const saturdays = yearWorkDays.filter(d => {
      const date = new Date(d.date)
      return date.getDay() === 6 && d.worked
    }).length
    const absences = yearWorkDays.filter(d => d.is_absence).length
    const vacations = yearWorkDays.filter(d => d.is_vacation).length

    const maxWeek = yearWeeks.length > 0
      ? yearWeeks.reduce((max, w) => (w.total_earned || 0) > (max.total_earned || 0) ? w : max, yearWeeks[0])
      : null
    const maxEarned = maxWeek ? (maxWeek.total_earned || 0) : 0

    return {
      totalEarned, totalWeeks, averagePerWeek, maxEarned,
      workedDays, saturdays, absences, vacations,
      breakdown: calc.breakdown,
    }
  }, [yearWorkDays, yearWeeks, rules])

  const yearlyComparison = useMemo(() => {
    const prevYear = selectedYear - 1
    const prevYearWeeks = workWeeks.filter(w => new Date(w.start_date).getFullYear() === prevYear)
    const prevTotal = prevYearWeeks.reduce((sum, w) => sum + (w.total_earned || 0), 0)
    const diff = stats.totalEarned - prevTotal
    const pct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0
    return { diff, pct, positive: diff >= 0, prevTotal }
  }, [stats, selectedYear, workWeeks])

  const monthlyComparison = useMemo(() => {
    const currentMonth = new Date().getMonth()
    const currentMonthData = monthlyData[currentMonth]
    const prevMonthData = currentMonth > 0 ? monthlyData[currentMonth - 1] : null
    if (!currentMonthData || !prevMonthData) return null
    const diff = currentMonthData.valor - prevMonthData.valor
    return { diff, positive: diff >= 0, current: currentMonthData.valor, prev: prevMonthData.valor }
  }, [monthlyData])

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 lg:space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Estatísticas</h1>
          <p className="text-sm md:text-base text-muted-foreground">Análise financeira em tempo real</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[60px] text-center">{selectedYear}</span>
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= currentYear}>
            <ChevronRight className="w-4 h-4" />
          </Button>
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
            {yearlyComparison.prevTotal > 0 && (
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
        {monthlyComparison && (
          <Card>
            <CardContent className="p-3 md:p-4">
              <span className="text-xs text-muted-foreground">Este Mês vs Anterior</span>
              <div className="flex items-center gap-1 mt-1">
                {monthlyComparison.positive ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                <span className={`text-base font-bold ${monthlyComparison.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {monthlyComparison.positive ? '+' : ''}{formatEuro(monthlyComparison.diff)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="monthly" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
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
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" className="text-sm" />
                      <YAxis className="text-sm" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value, _name, props) => [
                          formatEuro(Number(value)),
                          `${props.payload.semanas} sem, ${props.payload.dias} dias`
                        ]}
                      />
                      <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                        <Pie data={cityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="earned">
                          {cityData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value) => [formatEuro(Number(value)), 'Ganho']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    {cityData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-xs text-muted-foreground">{entry.name} ({entry.weeks} sem)</span>
                      </div>
                    ))}
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
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" className="text-sm" />
                      <YAxis className="text-sm" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [formatEuro(Number(value)), 'Valor']}
                      />
                      <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
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
                    stats.breakdown.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex-1">
                          <span className="text-sm text-foreground">{item.rule_name}</span>
                          <p className="text-[10px] text-muted-foreground">{item.reason}</p>
                        </div>
                        <span className={`text-sm font-bold ${item.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {item.amount >= 0 ? '+' : ''}{formatEuro(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem dados para este ano</p>
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
                  <p className="text-sm font-medium text-foreground">Resumo Anual {selectedYear}</p>
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
                  {yearlyComparison.prevTotal > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg mt-2">
                      <span className="text-xs text-muted-foreground">Comparação com {selectedYear - 1}</span>
                      <div className="flex items-center gap-2 mt-1">
                        {yearlyComparison.positive ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                        <span className={`text-sm font-medium ${yearlyComparison.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {yearlyComparison.positive ? '+' : ''}{formatEuro(yearlyComparison.diff)} ({yearlyComparison.pct}%)
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
