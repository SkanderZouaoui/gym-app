import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MembersPage } from './pages/MembersPage'
import { CoachesPage } from './pages/CoachesPage'
import { TeamPage } from './pages/TeamPage'
import { PlansPage } from './pages/PlansPage'
import { PlanningPage } from './pages/PlanningPage'
import { PrivatesPage } from './pages/PrivatesPage'
import { ExercisesPage } from './pages/ExercisesPage'
import { AttendancePage } from './pages/AttendancePage'
import { StatsPage } from './pages/StatsPage'
import { BrandPage } from './pages/BrandPage'
import { HomePage } from './pages/HomePage'
import { NavPage } from './pages/NavPage'
import { TextsPage } from './pages/TextsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { CoursesPage } from './pages/CoursesPage'
import { RulesPage } from './pages/RulesPage'
import { RolesPage } from './pages/RolesPage'
import { PublishPage } from './pages/PublishPage'
import { SettingsPage } from './pages/SettingsPage'
import { AppLayout } from './layouts/AppLayout'
import { RequireAuth } from './components/RequireAuth'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/publish" element={<PublishPage />} />

        <Route path="/members" element={<MembersPage />} />
        <Route path="/coaches" element={<CoachesPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/privates" element={<PrivatesPage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />

        <Route path="/brand" element={<BrandPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/nav" element={<NavPage />} />
        <Route path="/texts" element={<TextsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        <Route path="/plans" element={<PlansPage />} />
        <Route path="/courses" element={<CoursesPage />} />

        <Route path="/rules" element={<RulesPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
