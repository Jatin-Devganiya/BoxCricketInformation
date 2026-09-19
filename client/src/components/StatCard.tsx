import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  colorBg: string;
  colorIcon: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  colorBg,
  colorIcon,
}) => {
  return (
    <div className="card stat-card card-hover">
      <div className="stat-icon" style={{ background: colorBg }}>
        <Icon size={24} style={{ color: colorIcon }} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
};
