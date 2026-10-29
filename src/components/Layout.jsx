import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle, BarChart3, CalendarDays, Flame, LayoutDashboard, ListChecks, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatLong } from '../utils/dateUtils.js';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/habits', label: 'Habits', icon: ListChecks },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function Layout() {
  const { today, resolvedTheme, saveSettings, toasts, isGuest } = useData();
  const { user, signInWithGoogle, signOut, authConfigured, authError } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '';
  const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const { pathname } = useLocation();
  const title = pathname.startsWith('/day/')
    ? 'Day details'
    : NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label || 'My Habits';
  const dark = resolvedTheme === 'dark';

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <div className="brand"><Flame size={22} aria-hidden="true" /><span>My Habits</span></div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link">
            <Icon size={20} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="main">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p className="muted small">{formatLong(today)}</p>
          </div>
          <div className="topbar-actions">
          {user ? (
            <div className="user-chip" title={user.email}>
              {avatar
                ? <img src={avatar} alt="" referrerPolicy="no-referrer" className="avatar" />
                : <span className="avatar avatar-fallback" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>}
              <span className="user-name">{displayName}</span>
              <button type="button" className="icon-btn" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={18} /></button>
            </div>
          ) : (
            <button type="button" className="btn btn-google" onClick={signInWithGoogle} disabled={!authConfigured}>
              <GoogleMark /> <span>Sign in with Google</span>
            </button>
          )}
          <button
            type="button" className="icon-btn"
            title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => saveSettings({ theme: dark ? 'light' : 'dark' })}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          </div>
        </header>
        {isGuest && (
          <div className="guest-banner" role="alert">
            <AlertTriangle size={20} aria-hidden="true" />
            <div>
              <strong>You are not signed in — your data will NOT be saved.</strong>
              <span> Everything you add here disappears when you refresh or close this tab. Sign in with Google to save your habits and see them on any device.</span>
              {!authConfigured && <span className="small"> (Sign-in is not configured on this server yet — see the README.)</span>}
              {authError && <span className="error small"> {authError}</span>}
            </div>
            <button type="button" className="btn btn-primary" onClick={signInWithGoogle} disabled={!authConfigured}>
              <GoogleMark /> Sign in
            </button>
          </div>
        )}
        <main className="content"><Outlet /></main>
      </div>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>{t.message}</div>)}
      </div>
    </div>
  );
}
