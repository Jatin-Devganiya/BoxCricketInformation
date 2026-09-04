import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Shield,
  Calendar,
  Trophy,
  UserCog,
  LogOut,
  Menu,
  X,
  Activity
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pageTitle: string;
  pageSubtitle?: string;
  actions?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  pageTitle,
  pageSubtitle,
  actions,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'teams', label: 'Teams', icon: Shield },
    { id: 'series', label: 'Series', icon: Calendar },
    { id: 'matches', label: 'Matches', icon: Trophy },
    ...(isAdmin ? [{ id: 'users', label: 'User Management', icon: UserCog }] : []),
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} style={mobileOpen ? { transform: 'translateX(0)' } : {}}>
        <div className="sidebar-header">
          <div className="brand-icon">
            <Activity size={22} />
          </div>
          <div className="brand-title">CricketStats</div>
          {mobileOpen && (
            <button className="btn btn-sm btn-secondary" onClick={() => setMobileOpen(false)} style={{ marginLeft: 'auto' }}>
              <X size={16} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-info">
              <div className="user-avatar">
                {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>
              <div className="user-names">
                <span className="user-fullname">{user?.firstName} {user?.lastName}</span>
                <span className="user-role-tag">
                  {user?.roles?.join(', ') || 'Viewer'}
                </span>
              </div>
            </div>
            <button
              className="btn btn-sm btn-danger"
              onClick={logout}
              title="Logout"
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-sm btn-secondary md-hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ display: window.innerWidth <= 768 ? 'inline-flex' : 'none' }}
            >
              <Menu size={18} />
            </button>
            <div className="page-title-wrap">
              <h1>{pageTitle}</h1>
              {pageSubtitle && <p>{pageSubtitle}</p>}
            </div>
          </div>
          {actions && <div className="header-actions">{actions}</div>}
        </header>

        <main className="content-body">{children}</main>
      </div>
    </div>
  );
};
