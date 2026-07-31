import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  MapPin,
  Building2,
  Map,
  Users,
  Car,
  FileText,
  Clock,
  CheckCircle2,
  Moon,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  useTeams,
  useOperationsByWeek,
  useEmployees,
  useUpsertDailyRecord,
} from '@/hooks/use-admin-queries'
import { useAuthContext } from '@/hooks/use-auth-context'

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function EmployeeViewPage() {
  const { user } = useAuthContext()
  const [todayNotes, setTodayNotes] = useState('')
  const [sleptAway, setSleptAway] = useState<boolean | null>(null)

  const now = new Date()
  const year = now.getFullYear()
  const weekNumber = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)
  const todayStr = format(now, 'yyyy-MM-dd')

  const { data: teams = [] } = useTeams()
  const { data: employees = [] } = useEmployees()
  const { data: operations = [] } = useOperationsByWeek(year, weekNumber)
  const upsertRecord = useUpsertDailyRecord()

  const currentUserEmployee = useMemo(() => {
    return employees.find(e => e.user_id === user?.id)
  }, [employees, user])

  const myOperations = useMemo(() => {
    return operations.filter(op => {
      const members = op.members as Array<{ employee: { id: string } }> | null
      return members?.some(m => m.employee?.id === currentUserEmployee?.id)
    })
  }, [operations, currentUserEmployee])

  const [workStarted, setWorkStarted] = useState(false)
  const [workEnded, setWorkEnded] = useState(false)
  const [confirmedPresence, setConfirmedPresence] = useState(false)

  const handleConfirmPresence = async () => {
    if (!currentUserEmployee) return
    await upsertRecord.mutateAsync({
      employee_id: currentUserEmployee.id,
      date: todayStr,
      confirmed_presence: true,
    })
    setConfirmedPresence(true)
  }

  const handleStartWork = async () => {
    if (!currentUserEmployee) return
    await upsertRecord.mutateAsync({
      employee_id: currentUserEmployee.id,
      date: todayStr,
      work_started: true,
    })
    setWorkStarted(true)
  }

  const handleEndWork = async () => {
    if (!currentUserEmployee) return
    await upsertRecord.mutateAsync({
      employee_id: currentUserEmployee.id,
      date: todayStr,
      work_ended: true,
    })
    setWorkEnded(true)
  }

  const handleSaveNotes = async () => {
    if (!currentUserEmployee) return
    await upsertRecord.mutateAsync({
      employee_id: currentUserEmployee.id,
      date: todayStr,
      notes: todayNotes,
      slept_away: sleptAway ?? false,
    })
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-4"
    >
      <motion.div variants={item}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Hoje
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </motion.div>

      {myOperations.length === 0 ? (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma operação atribuída para esta semana.</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        myOperations.map((op) => {
          const leader = op.leader as { full_name: string } | null
          const vehicle = op.vehicle as { name: string; license_plate?: string } | null
          const team = teams.find(t => t.id === op.team_id)

          return (
            <motion.div key={op.id} variants={item}>
              <Card className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: team?.color || '#3B82F6' }}
                    >
                      {team?.name?.charAt(0) || 'E'}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{team?.name || 'Equipe'}</p>
                      <Badge variant="default" className="mt-1">Operação Publicada</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Destino</p>
                        <p className="font-medium text-foreground">{op.destination}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Empresa</p>
                        <p className="font-medium text-foreground">{op.company_name || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Map className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Local</p>
                        <p className="font-medium text-foreground">{op.company_location || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Responsável</p>
                        <p className="font-medium text-foreground">{leader?.full_name || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {vehicle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Veículo</p>
                        <p className="font-medium text-foreground">
                          {vehicle.name}
                          {vehicle.license_plate && ` (${vehicle.license_plate})`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="font-medium text-foreground">07:00</p>
                    </div>
                  </div>

                  {op.notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Observações</p>
                        <p className="font-medium text-foreground">{op.notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })
      )}

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Registo do Dia</p>
            
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant={confirmedPresence ? 'default' : 'outline'}
                className="justify-start"
                onClick={handleConfirmPresence}
                disabled={confirmedPresence}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {confirmedPresence ? 'Presença Confirmada' : 'Confirmar Presença'}
              </Button>
              
              <Button
                variant={workStarted ? 'default' : 'outline'}
                className="justify-start"
                onClick={handleStartWork}
                disabled={workStarted || !confirmedPresence}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                {workStarted ? 'Trabalho Iniciado' : 'Iniciar Trabalho'}
              </Button>
              
              <Button
                variant={workEnded ? 'default' : 'outline'}
                className="justify-start"
                onClick={handleEndWork}
                disabled={workEnded || !workStarted}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {workEnded ? 'Trabalho Encerrado' : 'Encerrar Trabalho'}
              </Button>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-2">Dormiu Fora?</p>
              <div className="flex gap-2">
                <Button
                  variant={sleptAway === true ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSleptAway(true)}
                >
                  <Moon className="w-3.5 h-3.5 mr-1" />
                  Sim
                </Button>
                <Button
                  variant={sleptAway === false ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSleptAway(false)}
                >
                  Não
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-2">Observações</p>
              <Textarea
                value={todayNotes}
                onChange={(e) => setTodayNotes(e.target.value)}
                placeholder="Adicione observações sobre o dia..."
                rows={3}
              />
            </div>

            <Button onClick={handleSaveNotes} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
