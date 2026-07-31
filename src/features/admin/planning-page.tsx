import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  Map,
  Users,
  Car,
  FileText,
  Send,
  Edit,
  Trash2,
  EyeOff,
  History,
} from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useTeams,
  useEmployees,
  useVehicles,
  useOperationsByWeek,
  useCreateOperation,
  useUpdateOperation,
  useDeleteOperation,
  usePublishOperation,
  useUnpublishOperation,
} from '@/hooks/use-admin-queries'

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

type Destination = 'Porto' | 'Lisboa' | 'Algarve'

const DESTINATIONS: Destination[] = ['Porto', 'Lisboa', 'Algarve']

interface OperationFormData {
  team_id: string
  destination: Destination
  company_name: string
  company_location: string
  leader_id: string
  vehicle_id: string
  notes: string
}

const DEFAULT_FORM: OperationFormData = {
  team_id: '',
  destination: 'Porto',
  company_name: '',
  company_location: '',
  leader_id: '',
  vehicle_id: '',
  notes: '',
}

export function PlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingOp, setEditingOp] = useState<string | null>(null)
  const [formData, setFormData] = useState<OperationFormData>(DEFAULT_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const year = currentDate.getFullYear()
  const weekNumber = Math.ceil(((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(currentDate.getFullYear(), 0, 1).getDay() + 1) / 7)

  const { data: teams = [] } = useTeams()
  const { data: employees = [] } = useEmployees()
  const { data: vehicles = [] } = useVehicles()
  const { data: operations = [], isLoading } = useOperationsByWeek(year, weekNumber)
  const createOperation = useCreateOperation()
  const updateOperation = useUpdateOperation()
  const deleteOperation = useDeleteOperation()
  const publishOperation = usePublishOperation()
  const unpublishOperation = useUnpublishOperation()

  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1))

  const teamWithoutOp = useMemo(() => {
    const opTeamIds = operations.map(op => op.team_id)
    return teams.filter(t => !opTeamIds.includes(t.id))
  }, [teams, operations])

  const handleOpenForm = (teamId?: string, op?: typeof operations[0]) => {
    if (op) {
      setEditingOp(op.id)
      setFormData({
        team_id: op.team_id,
        destination: op.destination as Destination,
        company_name: op.company_name || '',
        company_location: op.company_location || '',
        leader_id: op.leader_id || '',
        vehicle_id: op.vehicle_id || '',
        notes: op.notes || '',
      })
    } else {
      setEditingOp(null)
      setFormData({ ...DEFAULT_FORM, team_id: teamId || '' })
    }
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.team_id) return

    if (editingOp) {
      await updateOperation.mutateAsync({ id: editingOp, ...formData })
    } else {
      await createOperation.mutateAsync({ ...formData, week_number: weekNumber, year })
    }
    setShowForm(false)
    setFormData(DEFAULT_FORM)
    setEditingOp(null)
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    await deleteOperation.mutateAsync(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  const handlePublish = async (opId: string) => {
    await publishOperation.mutateAsync(opId)
  }

  const handleUnpublish = async (opId: string) => {
    await unpublishOperation.mutateAsync(opId)
  }

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || ''

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-4"
    >
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-6 h-6" />
            Planejamento Semanal
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize a operação de cada equipe
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Operação
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={prevWeek}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center min-w-[200px]">
          <p className="text-lg font-bold text-foreground">Semana {weekNumber}</p>
          <p className="text-xs text-muted-foreground">
            {format(weekStart, "d 'de' MMM", { locale: pt })} - {format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: pt })}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={nextWeek}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : operations.length === 0 ? (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Nenhuma operação para esta semana.</p>
              <Button onClick={() => handleOpenForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Operação
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item} className="space-y-4">
          {operations.map((op) => {
            const members = (op.members as Array<{ employee: { id: string; full_name: string; role: string } }>) || []
            const leader = op.leader as { full_name: string } | null
            const vehicle = op.vehicle as { name: string; license_plate?: string } | null

            return (
              <Card key={op.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: (teams.find(t => t.id === op.team_id)?.color) || '#3B82F6' }}
                        >
                          {getTeamName(op.team_id).charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{getTeamName(op.team_id)}</p>
                          <Badge variant={op.status === 'published' ? 'default' : 'secondary'} className="mt-1">
                            {op.status === 'published' ? 'Publicado' : 'Rascunho'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {op.status === 'draft' ? (
                          <Button variant="outline" size="sm" onClick={() => handlePublish(op.id)}>
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Publicar
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleUnpublish(op.id)}>
                            <EyeOff className="w-3.5 h-3.5 mr-1" />
                            Despublicar
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm" onClick={() => handleOpenForm(undefined, op)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirmId(op.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="font-medium text-foreground">{op.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span>{op.company_name || 'Não definido'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Map className="w-4 h-4" />
                        <span>{op.company_location || 'Não definido'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{leader?.full_name || 'Não definido'}</span>
                      </div>
                    </div>

                    {vehicle && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Car className="w-4 h-4" />
                        <span>{vehicle.name}</span>
                        {vehicle.license_plate && <span className="text-xs">({vehicle.license_plate})</span>}
                      </div>
                    )}

                    {op.notes && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4 mt-0.5" />
                        <span>{op.notes}</span>
                      </div>
                    )}

                    {members.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Funcionários:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {members.map((m) => (
                            <Badge key={m.employee.id} variant="secondary" className="text-xs">
                              {m.employee.full_name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {teamWithoutOp.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Equipes sem operação esta semana:</p>
                <div className="flex flex-wrap gap-2">
                  {teamWithoutOp.map((team) => (
                    <Button
                      key={team.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenForm(team.id)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {team.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOp ? 'Editar Operação' : 'Nova Operação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Equipe *</label>
              <Select value={formData.team_id} onValueChange={(v) => setFormData({ ...formData, team_id: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: team.color }} />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Destino *</label>
              <Select value={formData.destination} onValueChange={(v) => setFormData({ ...formData, destination: v as Destination })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATIONS.map((dest) => (
                    <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Empresa</label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Ex: Leroy Merlin"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Local</label>
              <Input
                value={formData.company_location}
                onChange={(e) => setFormData({ ...formData, company_location: e.target.value })}
                placeholder="Ex: Rua Eng. Ferreira Dias"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Responsável</label>
              <Select value={formData.leader_id} onValueChange={(v) => setFormData({ ...formData, leader_id: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'active').map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Veículo</label>
              <Select value={formData.vehicle_id} onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((veh) => (
                    <SelectItem key={veh.id} value={veh.id}>
                      {veh.name} {veh.license_plate && `(${veh.license_plate})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Observações</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formData.team_id}>
              {editingOp ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja eliminar esta operação?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de Alterações</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <p className="text-sm text-muted-foreground text-center py-8">
              O histórico de alterações será exibido aqui.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
