import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  MapPin, TrendingUp, BarChart2, Home, LogOut, Shield, RefreshCw
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/auth');
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase();

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-title">
            <span className="logo-dot" />
            TraceCarbone
          </div>
          <div className="logo-sub">Bilan déplacements</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Mes trajets</div>

          <NavLink
            to="/trajets-quotidiens"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Home className="nav-icon" />
            Trajets quotidiens
          </NavLink>

          <NavLink
            to="/trajets-exceptionnels"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <MapPin className="nav-icon" />
            Trajets exceptionnels
          </NavLink>

          <div className="nav-section-title" style={{ marginTop: 12 }}>Analyses</div>

          <NavLink
            to="/recapitulatif"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <RefreshCw className="nav-icon" />
            Récapitulatif
          </NavLink>

          <NavLink
            to="/statistiques"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <BarChart2 className="nav-icon" />
            Statistiques
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-section-title" style={{ marginTop: 12 }}>Administration</div>
              <button
                className="nav-item"
                onClick={() => navigate('/admin')}
              >
                <Shield className="nav-icon" />
                Back-office
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.displayName || 'Utilisateur'}
              </div>
              <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleLogout}>
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
