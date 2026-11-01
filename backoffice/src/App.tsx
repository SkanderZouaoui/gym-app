import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MembersPage } from './pages/MembersPage'
import { CashPage } from './pages/CashPage'
import { PlanningPage } from './pages/PlanningPage'
import { PlansPage } from './pages/PlansPage'
import { TeamPage } from './pages/TeamPage'
import { CatalogPage } from './pages/CatalogPage'
import { SettingsPage } from './pages/SettingsPage'
import { CommunicationPage } from './pages/CommunicationPage'
import { ProgramsPage } from './pages/ProgramsPage'
import { StatsPage } from './pages/StatsPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { AppShell } from './layouts/AppShell'
import { RequireAuth, RequireRole } from './components/Guards'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/cash" element={<CashPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/plans" element={<RequireRole roles={['ADMIN']}><PlansPage /></RequireRole>} />
        <Route path="/catalog" element={<RequireRole roles={['ADMIN']}><CatalogPage /></RequireRole>} />
        <Route path="/settings" element={<RequireRole roles={['ADMIN']}><SettingsPage /></RequireRole>} />
        <Route path="/communication" element={<RequireRole roles={['ADMIN']}><CommunicationPage /></RequireRole>} />
        <Route path="/programs" element={<RequireRole roles={['ADMIN']}><ProgramsPage /></RequireRole>} />
        <Route path="/stats" element={<RequireRole roles={['ADMIN']}><StatsPage /></RequireRole>} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/team" element={<RequireRole roles={['ADMIN']}><TeamPage /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
