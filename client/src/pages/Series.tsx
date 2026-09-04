import React, { useEffect, useState } from 'react';
import { seriesApi } from '../api/client';
import { Series as SeriesType, SeriesDetail } from '../types';
import { Modal } from '../components/Modal';
import {
  Calendar,
  Plus,
  Trophy,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface SeriesProps {
  onViewScorecard?: (matchId: number) => void;
}

export const Series: React.FC<SeriesProps> = ({ onViewScorecard }) => {
  const [seriesList, setSeriesList] = useState<SeriesType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Details Modal
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [selectedSeriesDetail, setSelectedSeriesDetail] = useState<SeriesDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Create / Edit Modal
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingSeries, setEditingSeries] = useState<SeriesType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: 'Scheduled',
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const data = await seriesApi.getAll();
      setSeriesList(data);
    } catch (err) {
      console.error('Failed to fetch series:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const handleOpenDetails = async (series: SeriesType) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const detail = await seriesApi.getById(series.id);
      setSelectedSeriesDetail(detail);
    } catch (err) {
      console.error('Failed to load series details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSeries(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      name: '',
      startDate: today,
      endDate: today,
      status: 'Scheduled',
      description: '',
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (series: SeriesType) => {
    setEditingSeries(series);
    setFormData({
      name: series.name,
      startDate: new Date(series.startDate).toISOString().split('T')[0],
      endDate: new Date(series.endDate).toISOString().split('T')[0],
      status: series.status,
      description: series.description || '',
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Series name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      if (editingSeries) {
        await seriesApi.update(editingSeries.id, formData);
      } else {
        await seriesApi.create(formData);
      }
      setEditModalOpen(false);
      fetchSeries();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save series.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSeries = async (id: number) => {
    if (!window.confirm('Cancel this series? Match records will be retained.')) return;
    try {
      await seriesApi.delete(id);
      fetchSeries();
    } catch (err) {
      alert('Failed to cancel series.');
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tournaments & Series</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Organize single-day box cricket tournaments or multi-day leagues
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Create Series
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Series Name</th>
                <th>Dates</th>
                <th>Type</th>
                <th>Matches</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading series...
                  </td>
                </tr>
              ) : seriesList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No series found. Create one to start scheduling matches.
                  </td>
                </tr>
              ) : (
                seriesList.map((s) => {
                  const startStr = new Date(s.startDate).toLocaleDateString();
                  const endStr = new Date(s.endDate).toLocaleDateString();
                  const isSingleDay = startStr === endStr;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div>{s.name}</div>
                        {s.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {s.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {isSingleDay ? startStr : `${startStr} - ${endStr}`}
                      </td>
                      <td>
                        <span className={`badge ${isSingleDay ? 'badge-info' : 'badge-warning'}`}>
                          {isSingleDay ? 'Single-Day' : 'Multi-Day'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>{s.completedMatches}</span> / {s.totalMatches} Completed
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            s.status === 'Completed'
                              ? 'badge-success'
                              : s.status === 'InProgress'
                              ? 'badge-warning'
                              : s.status === 'Cancelled'
                              ? 'badge-danger'
                              : 'badge-info'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenDetails(s)}
                            title="View Matches in Series"
                          >
                            <Trophy size={14} /> Matches
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenEdit(s)}
                            title="Edit Series"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteSeries(s.id)}
                            title="Cancel Series"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Series Details / Matches Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedSeriesDetail ? `${selectedSeriesDetail.name} - Match Schedule` : 'Series Details'}
        size="lg"
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading series matches...</div>
        ) : !selectedSeriesDetail ? (
          <div>Series details not found.</div>
        ) : (
          <div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Match #</th>
                    <th>Teams</th>
                    <th>Date & Time</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Result</th>
                    <th style={{ textAlign: 'right' }}>Scorecard</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSeriesDetail.matches.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No matches scheduled in this series yet.
                      </td>
                    </tr>
                  ) : (
                    selectedSeriesDetail.matches.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 700 }}>Match {m.matchOrder}</td>
                        <td style={{ fontWeight: 600 }}>
                          {m.team1Name} vs {m.team2Name}
                        </td>
                        <td>
                          {new Date(m.scheduledDate).toLocaleDateString()} {m.scheduledTime}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.address}</td>
                        <td>
                          <span
                            className={`badge ${
                              m.status === 'Completed'
                                ? 'badge-success'
                                : m.status === 'InProgress'
                                ? 'badge-warning'
                                : 'badge-info'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td style={{ color: m.result ? '#10b981' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {m.result || 'Pending'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setDetailModalOpen(false);
                              if (onViewScorecard) onViewScorecard(m.id);
                            }}
                          >
                            Scorecard
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Series Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingSeries ? `Edit Series: ${editingSeries.name}` : 'Create New Tournament / Series'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveSeries} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Series'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveSeries}>
          {formError && (
            <div className="alert alert-danger">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Series / Tournament Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Sunday Super 6s League"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date * (Same for single-day)</label>
              <input
                type="date"
                className="form-input"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Scheduled">Scheduled</option>
              <option value="InProgress">InProgress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Notes</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Box cricket rules: 6 overs per innings, 5 players per side"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
