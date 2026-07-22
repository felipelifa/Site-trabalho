import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuthContext } from '@/hooks/use-auth-context'
import { AppLayout } from '@/components/layout/app-layout'
import { AuthLayout } from '@/components/layout/auth-layout'

const LoginPage = lazy(() => import('@/features/auth/login-page').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/features/auth/register-page').then(m => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page').then(m => ({ default: m.DashboardPage })))
const CalendarPage = lazy(() => import('@/features/calendar/calendar-page').then(m => ({ default: m.CalendarPage })))
const WeeklyRegistrationPage = lazy(() => import('@/features/weeks/weekly-registration-page').then(m => ({ default: m.WeeklyRegistrationPage })))
const StatisticsPage = lazy(() => import('@/features/statistics/statistics-page').then(m => ({ default: m.StatisticsPage })))
const NotesPage = lazy(() => import('@/features/notes/notes-page').then(m => ({ default: m.NotesPage })))
const ChecklistsPage = lazy(() => import('@/features/checklists/checklists-page').then(m => ({ default: m.ChecklistsPage })))
const RemindersPage = lazy(() => import('@/features/reminders/reminders-page').then(m => ({ default: m.RemindersPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/', { replace: true })
  }, [navigate])
  return <PageLoader />
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthContext()

  if (loading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthContext()

  if (loading) {
    return <PageLoader />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/auth"
          element={
            <PublicRoute>
              <AuthLayout />
            </PublicRoute>
          }
        >
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="callback" element={<AuthCallback />} />
        </Route>

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="weeks" element={<WeeklyRegistrationPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="checklists" element={<ChecklistsPage />} />
          <Route path="reminders" element={<RemindersPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
