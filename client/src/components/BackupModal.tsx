import React, { useState, useEffect, useRef } from 'react';
import { backupApi, isLocalStorageMode } from '../api/client';
import { LocalStorageDataStore } from '../storage/LocalStorageDataStore';
import { ImportValidationResult } from '../types';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileJson,
  Layers,
  HardDrive,
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<{
    usedBytes: number;
    estimatedMb: number;
    recordCounts: Record<string, number>;
  }>({
    usedBytes: 0,
    estimatedMb: 0,
    recordCounts: {},
  });

  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStorageStats = () => {
    try {
      const s = LocalStorageDataStore.getStorageUsage();
      setStats(s);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStorageStats();
      setValidationResult(null);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      backupApi.downloadExportFile();
      setStatusMessage({
        type: 'success',
        text: 'CricketStats JSON export generated and downloaded successfully.',
      });
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Export failed: ${e.message}`,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = backupApi.validateImport(content);
      setValidationResult(result);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!validationResult || !validationResult.isValid || !validationResult.data) return;

    setImporting(true);
    try {
      backupApi.importData(validationResult.data);
      loadStorageStats();
      setStatusMessage({
        type: 'success',
        text: 'Data imported successfully! All records, relationships, and scores restored.',
      });
      setValidationResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Import failed: ${e.message}`,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleResetSeed = () => {
    if (window.confirm('Are you sure you want to reset LocalStorage to default sample seed data? Current unsaved changes will be replaced.')) {
      backupApi.resetDatabase();
      loadStorageStats();
      setStatusMessage({
        type: 'info',
        text: 'Database successfully reset to default sample tournament seed data.',
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card, #1e293b)',
          color: 'var(--text-primary, #f8fafc)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-color, #334155)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Database size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Storage & Database Migration
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Temporary LocalStorage database manager and SQL Server export/import
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Storage Mode Badge */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: isLocalStorageMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${isLocalStorageMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <HardDrive size={18} color={isLocalStorageMode ? '#10b981' : '#3b82f6'} />
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Storage Mode: </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: isLocalStorageMode ? '#10b981' : '#3b82f6',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {isLocalStorageMode ? 'LocalStorage (Temporary DB)' : '.NET Web API (SQL Server)'}
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '20px',
                background: isLocalStorageMode ? '#10b981' : '#3b82f6',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {isLocalStorageMode ? 'Active' : 'Connected'}
            </span>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background:
                  statusMessage.type === 'success'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : statusMessage.type === 'error'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(59, 130, 246, 0.15)',
                color:
                  statusMessage.type === 'success'
                    ? '#10b981'
                    : statusMessage.type === 'error'
                    ? '#ef4444'
                    : '#3b82f6',
                border: `1px solid ${
                  statusMessage.type === 'success'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : statusMessage.type === 'error'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(59, 130, 246, 0.3)'
                }`,
              }}
            >
              {statusMessage.type === 'success' && <CheckCircle2 size={18} />}
              {statusMessage.type === 'error' && <XCircle size={18} />}
              {statusMessage.type === 'info' && <CheckCircle2 size={18} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Record Counts & Storage Quota Grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                LocalStorage Database Collections & Records
              </span>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                Est. Size: ~{stats.estimatedMb} MB
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.5rem',
              }}
            >
              {[
                { label: 'Players', count: stats.recordCounts.players || 0 },
                { label: 'Teams', count: stats.recordCounts.teams || 0 },
                { label: 'Series', count: stats.recordCounts.series || 0 },
                { label: 'Matches', count: stats.recordCounts.matches || 0 },
                { label: 'Innings', count: stats.recordCounts.match_innings || 0 },
                { label: 'Ball Events', count: stats.recordCounts.ball_events || 0 },
                { label: 'Batting Stats', count: stats.recordCounts.match_batting_performances || 0 },
                { label: 'Bowling Stats', count: stats.recordCounts.match_bowling_performances || 0 },
                { label: 'Users', count: stats.recordCounts.users || 0 },
                { label: 'Team Players', count: stats.recordCounts.team_players || 0 },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-color, #334155)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a3b8)' }}>{item.label}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Export Action Card */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #334155)',
              background: 'var(--bg-secondary, rgba(255,255,255,0.02))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Export Complete Database (JSON)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Exports all normalized collections with IDs and foreign keys for SQL Server migration.
              </div>
            </div>
            <button
              onClick={handleExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
            >
              <Download size={16} />
              Export JSON
            </button>
          </div>

          {/* Import Section */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #334155)',
              background: 'var(--bg-secondary, rgba(255,255,255,0.02))',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Import Database JSON Backup</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
              Select a previous <code style={{ color: '#10b981' }}>CricketStats_Export_*.json</code> file to preview and restore state.
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary, #94a3b8)',
                padding: '0.5rem',
                border: '1px dashed var(--border-color, #334155)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            />

            {/* Validation Preview Card */}
            {validationResult && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  background: validationResult.isValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${validationResult.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {validationResult.isValid ? (
                    <CheckCircle2 size={18} color="#10b981" />
                  ) : (
                    <AlertTriangle size={18} color="#ef4444" />
                  )}
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: validationResult.isValid ? '#10b981' : '#ef4444' }}>
                    {validationResult.isValid ? 'File Validated Successfully - Ready to Import' : 'Validation Failed'}
                  </span>
                </div>

                {validationResult.errors.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                    {validationResult.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}

                {validationResult.isValid && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '0.5rem' }}>
                      Preview of records to import:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem' }}>
                      {Object.entries(validationResult.recordCounts).map(([col, cnt]) => (
                        <span
                          key={col}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.06)',
                            fontWeight: 500,
                          }}
                        >
                          {col}: <strong style={{ color: '#10b981' }}>{cnt}</strong>
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        onClick={handleConfirmImport}
                        disabled={importing}
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          padding: '0.5rem 1.25rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: importing ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {importing ? 'Importing...' : 'Confirm & Restore Data'}
                      </button>
                      <button
                        onClick={() => {
                          setValidationResult(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        style={{
                          background: 'transparent',
                          color: 'var(--text-secondary, #94a3b8)',
                          border: '1px solid var(--border-color, #334155)',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reset / Seed Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button
              onClick={handleResetSeed}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'transparent',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
              Reset to Default Sample Seed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
