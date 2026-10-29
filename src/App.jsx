import { Navigate, Route, Routes } from 'react-router-dom';
import { useData } from './context/DataContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import HabitsPage from './pages/HabitsPage.jsx';
import DayPage from './pages/DayPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  const { status, error, load } = useData();
  if (status === 'loading') return <div className="splash"><p>Loading your habits...</p></div>;
  if (status === 'error') {
    return (
      <div className="splash">
        <h1>Can't load your data</h1>
        <p className="muted">{error}</p>
        <p className="muted small">Check that the backend is running and the Supabase tables exist.</p>
        <button className="btn btn-primary" onClick={load}>Try again</button>
      </div>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="day/:date" element={<DayPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
