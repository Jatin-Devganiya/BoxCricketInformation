import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  Activity,
  Sun,
  Moon,
  Database,
} from 'lucide-react';
import { BackupModal } from './BackupModal';
import { isLocalStorageMode } from '../api/client';


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
  const { user, canManageUsers, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'teams', label: 'Teams', icon: Shield },
    { id: 'series', label: 'Series', icon: Calendar },
    { id: 'matches', label: 'Matches', icon: Trophy },
    ...(canManageUsers ? [{ id: 'users', label: 'User Management', icon: UserCog }] : []),
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar Backdrop for screens below laptop (< 1024px) */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          title="Close Navigation Menu"
        />
      )}

      {/* Sidebar - permanently visible on laptop (>= 1024px), off-canvas drawer below */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-icon">
            <Activity size={22} />
          </div>
          <div className="brand-title">CricketStats</div>
          <button
            className="btn btn-sm btn-secondary sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            title="Close Sidebar"
          >
            <X size={16} />
          </button>
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
              className="btn btn-sm btn-secondary sidebar-toggle-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              title="Toggle Navigation Menu"
            >
              <Menu size={18} />
            </button>
            <div className="page-title-wrap">
              <h1>{pageTitle}</h1>
              {pageSubtitle && <p>{pageSubtitle}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {actions && <div className="header-actions">{actions}</div>}

            <button
              type="button"
              id="storage-backup-button"
              className="btn btn-secondary"
              onClick={() => setBackupModalOpen(true)}
              title="Storage Management & Database Export/Import"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderColor: isLocalStorageMode ? 'rgba(16, 185, 129, 0.4)' : undefined,
                color: isLocalStorageMode ? '#10b981' : undefined,
              }}
            >
              <Database size={16} />
              <span>{isLocalStorageMode ? 'LocalStorage DB' : 'API Mode'}</span>
            </button>

            <button
              type="button"
              id="theme-toggle-button"
              className="btn btn-secondary theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={17} />
                  <span className="theme-toggle-text">Light</span>
                </>
              ) : (
                <>
                  <Moon size={17} />
                  <span className="theme-toggle-text">Dark</span>
                </>
              )}
            </button>
          </div>
        </header>

        <main className="content-body">{children}</main>

        <BackupModal
          isOpen={backupModalOpen}
          onClose={() => setBackupModalOpen(false)}
        />
      </div>
    </div>
  );
};

