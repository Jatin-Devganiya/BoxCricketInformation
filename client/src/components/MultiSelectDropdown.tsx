import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Search, X, Users } from 'lucide-react';

export interface MultiSelectOption {
  id: string | number;
  label: string;
  subLabel?: string;
  badge?: string;
}

export interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedIds: (string | number)[];
  onChange: (selectedIds: (string | number)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select players to add to squad...',
  searchPlaceholder = 'Search players by name or role...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, searchTerm]);

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const handleToggleOption = (id: string | number) => {
    const idStr = String(id);
    if (selectedSet.has(idStr)) {
      onChange(selectedIds.filter((item) => String(item) !== idStr));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const newSelected = new Set(selectedSet);
    filteredOptions.forEach((opt) => newSelected.add(String(opt.id)));
    // Preserve original ID types where possible
    const updated = options.filter((opt) => newSelected.has(String(opt.id))).map((opt) => opt.id);
    onChange(updated);
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Badge background coloring
  const getBadgeStyle = (category?: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('bat')) {
      return { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
    if (cat.includes('bowl')) {
      return { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' };
    }
    if (cat.includes('all')) {
      return { background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)' };
    }
    if (cat.includes('keeper')) {
      return { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
    }
    return { background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)' };
  };

  const selectedOptions = options.filter((opt) => selectedSet.has(String(opt.id)));

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
      }}
    >
      {/* Trigger Button */}
      <div
        id="multiselect-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          minHeight: '42px',
          padding: '0.45rem 0.85rem',
          borderRadius: '8px',
          border: `1px solid ${isOpen ? 'var(--accent-cricket)' : 'var(--border-color)'}`,
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: isOpen ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            flexWrap: 'wrap',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {selectedIds.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{placeholder}</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: 'var(--accent-cricket)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Users size={13} />
                {selectedIds.length} {selectedIds.length === 1 ? 'Player' : 'Players'} Selected
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: '0.35rem',
                  flexWrap: 'wrap',
                  maxHeight: '48px',
                  overflowY: 'auto',
                }}
              >
                {selectedOptions.slice(0, 3).map((opt) => (
                  <span
                    key={String(opt.id)}
                    style={{
                      fontSize: '0.78rem',
                      background: 'var(--bg-card)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {opt.label}
                  </span>
                ))}
                {selectedOptions.length > 3 && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      padding: '0.15rem 0.35rem',
                    }}
                  >
                    +{selectedOptions.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {selectedIds.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear selection"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.2rem',
                borderRadius: '50%',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={15} />
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-muted)',
              transition: 'transform 0.2s',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          id="multiselect-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Search Input Bar */}
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0.25rem 0',
                fontSize: '0.88rem',
                color: 'var(--text-primary)',
                width: '100%',
                outline: 'none',
                boxShadow: 'none',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.15rem',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Actions Bar (Select All / Clear) */}
          <div
            style={{
              padding: '0.45rem 0.85rem',
              background: 'rgba(0,0,0,0.1)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              {filteredOptions.length} available {filteredOptions.length === 1 ? 'player' : 'players'}
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                disabled={filteredOptions.length === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cricket)',
                  cursor: filteredOptions.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  padding: 0,
                  opacity: filteredOptions.length === 0 ? 0.5 : 1,
                }}
              >
                Select All ({filteredOptions.length})
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearAll()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    padding: 0,
                  }}
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '0.35rem 0',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                }}
              >
                {searchTerm ? 'No players matching your search' : 'No available players to add'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedSet.has(String(opt.id));
                const badgeStyle = getBadgeStyle(opt.badge);

                return (
                  <div
                    key={String(opt.id)}
                    onClick={() => handleToggleOption(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent-cricket)' : '3px solid transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {/* Checkbox */}
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: isSelected
                            ? '1.5px solid var(--accent-cricket)'
                            : '1.5px solid var(--border-color)',
                          background: isSelected ? 'var(--accent-cricket)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s',
                        }}
                      >
                        {isSelected && <Check size={13} color="#ffffff" strokeWidth={3} />}
                      </div>

                      {/* Name & SubLabel */}
                      <div>
                        <div
                          style={{
                            fontWeight: isSelected ? 600 : 500,
                            fontSize: '0.88rem',
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {opt.label}
                        </div>
                        {opt.subLabel && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role / Category Badge */}
                    {opt.badge && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          ...badgeStyle,
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
