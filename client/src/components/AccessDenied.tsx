import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AccessDeniedProps {
  onNavigateDashboard?: () => void;
  message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  onNavigateDashboard,
  message = 'You do not have permission to access this page. This administrative section requires System Administrator privileges.'
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        textAlign: 'center',
        minHeight: '60vh'
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          color: '#ef4444'
        }}
      >
        <ShieldAlert size={36} />
      </div>

      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.6rem', color: '#fff' }}>
        Access Denied (403)
      </h2>

      <p
        style={{
          fontSize: '0.95rem',
          color: 'var(--text-secondary)',
          maxWidth: '440px',
          lineHeight: '1.5',
          marginBottom: '1.75rem'
        }}
      >
        {message}
      </p>

      {onNavigateDashboard && (
        <button
          className="btn btn-primary"
          onClick={onNavigateDashboard}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      )}
    </div>
  );
};
