import React, { useEffect, useState } from 'react';
import { seriesApi } from '../api/client';
import { Series as SeriesType, SeriesDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { getAllowedSeriesTransitions, isSeriesStatusLocked } from '../utils/statusRules';
import {
  Calendar,
  Plus,
  Trophy,
  Edit2,
  Trash2,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast
} from 'lucide-react';

interface SeriesProps {
  onViewScorecard?: (matchId: number) => void;
}

export const Series: React.FC<SeriesProps> = ({ onViewScorecard }) => {
  const { canManageSeries, user, isAdmin } = useAuth();
  const [seriesList, setSeriesList] = useState<SeriesType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Sorting
  type SortField = 'name' | 'dates' | 'type' | 'matches' | 'status';
  const [sortField, setSortField] = useState<SortField>('dates');
  const [sortAsc, setSortAsc] = useState<boolean>(false); // Most recent dates first by default

  // Pagination (Default 100)
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, typeFilter, sortField, sortAsc, pageSize]);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // For dates, descending (newest first) on first click
      setSortAsc(field === 'dates' ? false : true);
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} style={{ opacity: 0.3, marginLeft: '0.35rem', verticalAlign: 'middle' }} />;
    }
    return sortAsc ? (
      <ArrowUp size={13} style={{ color: '#10b981', marginLeft: '0.35rem', verticalAlign: 'middle' }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#10b981', marginLeft: '0.35rem', verticalAlign: 'middle' }} />
    );
  };

  const filteredSeries = seriesList.filter((s) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchDesc = (s.description || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    if (status && s.status.toLowerCase() !== status.toLowerCase()) {
      return false;
    }
    if (typeFilter) {
      const startStr = new Date(s.startDate).toLocaleDateString();
      const endStr = new Date(s.endDate).toLocaleDateString();
      const isSingleDay = startStr === endStr;
      if (typeFilter === 'Single-Day' && !isSingleDay) return false;
      if (typeFilter === 'Multi-Day' && isSingleDay) return false;
    }
    return true;
  });

  const sortedSeries = [...filteredSeries].sort((a, b) => {
    if (sortField === 'name') {
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    if (sortField === 'dates') {
      const aTime = new Date(a.startDate).getTime();
      const bTime = new Date(b.startDate).getTime();
      return sortAsc ? aTime - bTime : bTime - aTime;
    }
    if (sortField === 'type') {
      const aSingle = new Date(a.startDate).toLocaleDateString() === new Date(a.endDate).toLocaleDateString();
      const bSingle = new Date(b.startDate).toLocaleDateString() === new Date(b.endDate).toLocaleDateString();
      const aType = aSingle ? 'Single-Day' : 'Multi-Day';
      const bType = bSingle ? 'Single-Day' : 'Multi-Day';
      return sortAsc ? aType.localeCompare(bType) : bType.localeCompare(aType);
    }
    if (sortField === 'matches') {
      const diff = (a.completedMatches || 0) - (b.completedMatches || 0);
      if (diff !== 0) return sortAsc ? diff : -diff;
      return (a.totalMatches || 0) - (b.totalMatches || 0);
    }
    if (sortField === 'status') {
      return sortAsc ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
    }
    return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
  });

  // Pagination calculations
  const totalSeries = sortedSeries.length;
  const totalPages = Math.max(1, Math.ceil(totalSeries / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalSeries === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalSeries);
  const paginatedSeries = sortedSeries.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

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
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError('Series name is required.');
      return;
    }

    // Immediate client-side uniqueness validation
    if (formData.status !== 'Cancelled') {
      const isDuplicate = seriesList.some(
        (s) =>
          s.status !== 'Cancelled' &&
          (!editingSeries || s.id !== editingSeries.id) &&
          s.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      if (isDuplicate) {
        setFormError('Series name already exists.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setFormError(null);
      if (editingSeries) {
        await seriesApi.update(editingSeries.id, formData);
      } else {
        await seriesApi.create({
          ...formData,
          createdByUserId: user?.id,
        });
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel series.');
    }
  };

  return (
    <div>
      {/* Header & Add Button */}
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tournaments & Series</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Organize single-day box cricket tournaments or multi-day leagues
          </p>
        </div>
        {canManageSeries && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Create Series
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder="Search series by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: '135px' }}
          >
            <option value="">All Types</option>
            <option value="Single-Day">Single-Day</option>
            <option value="Multi-Day">Multi-Day</option>
          </select>

          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '145px' }}
          >
            <option value="">All Status</option>
            <option value="Scheduled">Scheduled</option>
            <option value="InProgress">InProgress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('name')}
                  title="Series Name - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Series Name
                    {renderSortIndicator('name')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('dates')}
                  title="Dates - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Dates
                    {renderSortIndicator('dates')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('type')}
                  title="Type - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Type
                    {renderSortIndicator('type')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('matches')}
                  title="Matches - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Matches
                    {renderSortIndicator('matches')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('status')}
                  title="Status - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Status
                    {renderSortIndicator('status')}
                  </div>
                </th>
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
              ) : paginatedSeries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No series found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedSeries.map((s) => {
                  const startStr = new Date(s.startDate).toLocaleDateString();
                  const endStr = new Date(s.endDate).toLocaleDateString();
                  const isSingleDay = startStr === endStr;
                  const isOwner = isAdmin || !s.createdByUserId || Boolean(user?.id && String(s.createdByUserId) === String(user.id));
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div>{s.name}</div>
                        {s.createdByUsername && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <span style={{
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: isOwner ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                              color: isOwner ? '#10b981' : 'var(--text-secondary)',
                              fontWeight: 500
                            }}>
                              By: {s.createdByUsername}{isOwner && !isAdmin ? ' (You)' : ''}
                            </span>
                          </div>
                        )}
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
                        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenDetails(s)}
                            title="View Matches in Series"
                          >
                            <Trophy size={14} /> Matches
                          </button>
                          {canManageSeries && (
                            isOwner ? (
                              <>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleOpenEdit(s)}
                                  title="Edit Series"
                                >
                                  <Edit2 size={14} />
                                </button>
                                {!isSeriesStatusLocked(s.status) && (
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDeleteSeries(s.id)}
                                    title="Cancel Series"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  alignSelf: 'center',
                                  fontStyle: 'italic',
                                  padding: '0 0.25rem'
                                }}
                                title={`Managed by ${s.createdByUsername || 'another umpire'}`}
                              >
                                View-Only
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Left: Summary & Rows Per Page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {totalSeries === 0 ? 0 : startIndex + 1}
              </strong>{' '}
              to{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {endIndex}
              </strong>{' '}
              of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {totalSeries}
              </strong>{' '}
              series
            </span>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Rows per page:</span>
              <select
                className="form-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  width: '85px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.85rem',
                  height: '32px',
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage <= 1}
              title="First Page"
              style={{
                padding: '0.35rem 0.55rem',
                opacity: safeCurrentPage <= 1 ? 0.45 : 1,
                cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronFirst size={16} />
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              title="Previous Page"
              style={{
                padding: '0.35rem 0.55rem',
                opacity: safeCurrentPage <= 1 ? 0.45 : 1,
                cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page number pills */}
            {getPageNumbers().map((p, idx) =>
              typeof p === 'number' ? (
                <button
                  key={idx}
                  className={`btn btn-sm ${p === safeCurrentPage ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    minWidth: '34px',
                    padding: '0.35rem 0.6rem',
                    fontWeight: p === safeCurrentPage ? 700 : 500,
                  }}
                >
                  {p}
                </button>
              ) : (
                <span
                  key={idx}
                  style={{
                    padding: '0 0.35rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    userSelect: 'none',
                  }}
                >
                  ...
                </span>
              )
            )}

            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              title="Next Page"
              style={{
                padding: '0.35rem 0.55rem',
                opacity: safeCurrentPage >= totalPages ? 0.45 : 1,
                cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              title="Last Page"
              style={{
                padding: '0.35rem 0.55rem',
                opacity: safeCurrentPage >= totalPages ? 0.45 : 1,
                cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLast size={16} />
            </button>
          </div>
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
              disabled={editingSeries ? isSeriesStatusLocked(editingSeries.status) : false}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              {getAllowedSeriesTransitions(editingSeries?.status).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            {editingSeries && isSeriesStatusLocked(editingSeries.status) && (
              <small style={{ color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                This series is {editingSeries.status.toLowerCase()}. Series status cannot be changed.
              </small>
            )}
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
