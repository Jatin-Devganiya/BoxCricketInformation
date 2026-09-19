import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Players } from './pages/Players';
import { Teams } from './pages/Teams';
import { Series } from './pages/Series';
import { Matches } from './pages/Matches';
import { Users } from './pages/Users';
import { AccessDenied } from './components/AccessDenied';

const MainApp: React.FC = () => {
  const { isAuthenticated, loading, canManageUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [scorecardMatchId, setScorecardMatchId] = useState<number | null>(null);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
        }}
      >
        Initializing Cricket Portal...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleOpenScorecard = (matchId: number) => {
    setScorecardMatchId(matchId);
    setActiveTab('matches');
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'Overview of matches, stats, and tournament leaders' };
      case 'players':
        return { title: 'Players Directory', subtitle: 'Cricket player profiles and batting/bowling statistics' };
      case 'teams':
        return { title: 'Teams & Rosters', subtitle: 'Box cricket teams and squad management' };
      case 'series':
        return { title: 'Series & Tournaments', subtitle: 'Organize single-day and multi-day competitions' };
      case 'matches':
        return { title: 'Match Management', subtitle: 'Schedule matches and enter player scorecards' };
      case 'users':
        return { title: 'User Management', subtitle: 'Administrative control of accounts and roles' };
      default:
        return { title: 'Cricket Statistics', subtitle: 'Management System' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      pageTitle={title}
      pageSubtitle={subtitle}
    >
      {activeTab === 'dashboard' && (
        <Dashboard onNavigate={setActiveTab} onViewMatchScorecard={handleOpenScorecard} />
      )}
      {activeTab === 'players' && <Players />}
      {activeTab === 'teams' && <Teams />}
      {activeTab === 'series' && <Series onViewScorecard={handleOpenScorecard} />}
      {activeTab === 'matches' && (
        <Matches
          initialScorecardMatchId={scorecardMatchId}
          onClearInitialMatchId={() => setScorecardMatchId(null)}
        />
      )}
      {activeTab === 'users' && (
        canManageUsers ? (
          <Users />
        ) : (
          <AccessDenied onNavigateDashboard={() => setActiveTab('dashboard')} />
        )
      )}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
