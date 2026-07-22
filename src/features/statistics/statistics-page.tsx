import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkWeeks } from '@/hooks/use-queries'

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

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']

function formatEuro(value: number): string {
  return `€${value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function StatisticsPage() {
  const { data: workWeeks = [] } = useWorkWeeks()

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const currentYear = new Date().getFullYear()
    return months.map((month, index) => {
      const monthWeeks = workWeeks.filter(w => {
        const date = new Date(w.start_date)
        return date.getMonth() === index && date.getFullYear() === currentYear
      })
      const totalEarned = monthWeeks.reduce((sum, w) => sum + (w.total_earned || 0), 0)
      return {
        name: month,
        valor: totalEarned,
        semanas: monthWeeks.length,
      }
    })
  }, [workWeeks])

  const cityData = useMemo(() => {
    const cities: Record<string, number> = {}
    workWeeks.forEach(week => {
      const city = week.destination || 'Não definido'
      cities[city] = (cities[city] || 0) + 1
    })
    return Object.entries(cities).map(([name, value]) => ({ name, value }))
  }, [workWeeks])

  const stats = useMemo(() => {
    const totalEarned = workWeeks.reduce((sum, w) => sum + (w.total_earned || 0), 0)
    const totalWeeks = workWeeks.length
    const averagePerWeek = totalWeeks > 0 ? totalEarned / totalWeeks : 0
    const maxEarned = Math.max(...workWeeks.map(w => w.total_earned || 0), 0)
    const portoWeeks = workWeeks.filter(w => w.destination === 'Porto').length
    const lisboaWeeks = workWeeks.filter(w => w.destination === 'Lisboa').length
    const algarveWeeks = workWeeks.filter(w => w.destination === 'Algarve').length

    return {
      totalEarned,
      totalWeeks,
      averagePerWeek,
      maxEarned,
      portoWeeks,
      lisboaWeeks,
      algarveWeeks,
    }
  }, [workWeeks])

  const citySummary = useMemo(() => {
    const cities: Record<string, { weeks: number; earned: number }> = {}
    workWeeks.forEach(week => {
      const city = week.destination || 'Não definido'
      if (!cities[city]) cities[city] = { weeks: 0, earned: 0 }
      cities[city].weeks++
      cities[city].earned += week.total_earned || 0
    })
    return Object.entries(cities).map(([name, data]) => ({
      name,
      weeks: data.weeks,
      earned: data.earned,
    }))
  }, [workWeeks])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold text-foreground">Estatísticas</h1>
        <p className="text-muted-foreground">Analise seu desempenho financeiro</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Ganho</p>
            <p className="text-2xl font-bold text-foreground">
              {formatEuro(stats.totalEarned)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Média Semanal</p>
            <p className="text-2xl font-bold text-foreground">
              {formatEuro(stats.averagePerWeek)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Maior Semana</p>
            <p className="text-2xl font-bold text-foreground">
              {formatEuro(stats.maxEarned)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total de Semanas</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalWeeks}</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="monthly" className="space-y-4">
          <TabsList>
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="cities">Cidades</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ganhos por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
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
                        formatter={(value) => [formatEuro(Number(value)), 'Valor']}
                      />
                      <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cities">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Cidade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
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
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    {cityData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.name} ({entry.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo por Cidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {citySummary.map((city) => (
                    <div key={city.name} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                      <div>
                        <span className="text-sm font-medium text-foreground">{city.name}</span>
                        <p className="text-xs text-muted-foreground">{city.weeks} semanas</p>
                      </div>
                      <span className="font-medium text-foreground">{formatEuro(city.earned)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border-t">
                    <span className="text-sm font-medium text-foreground">Total</span>
                    <span className="font-bold text-foreground">{formatEuro(stats.totalEarned)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tendência de Ganhos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
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
                      <Line
                        type="monotone"
                        dataKey="valor"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
