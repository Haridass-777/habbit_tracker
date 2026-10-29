import {
  Target, Dumbbell, Code, BookOpen, TrendingUp, GraduationCap, Moon, Brain, Heart, Coffee, Droplets, Music, PenLine, Salad,
} from 'lucide-react';

export const ICONS = { Target, Dumbbell, Code, BookOpen, TrendingUp, GraduationCap, Moon, Brain, Heart, Coffee, Droplets, Music, PenLine, Salad };
export function HabitIcon({ name, size = 18 }) {
  const Icon = ICONS[name] || Target;
  return <Icon size={size} aria-hidden="true" />;
}

export const STATUS_LABEL = {
  complete: 'All habits completed', partial: 'Some habits completed', missed: 'No habits completed',
  pending: 'In progress', future: 'Upcoming', none: 'No habits tracked',
};

export function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card summary">
      <div className="summary-top"><span className="summary-icon"><Icon size={18} aria-hidden="true" /></span><span className="muted">{label}</span></div>
      <div className="summary-value">{value}</div>
      {hint && <div className="muted small">{hint}</div>}
    </div>
  );
}

export function CompletionBadge({ stats }) {
  if (stats.total === 0) return <span className="badge status-none" aria-label="No habits tracked">–</span>;
  const pct = Math.round(stats.pct);
  return (
    <span className={`badge status-${stats.status}`} aria-label={`${pct} percent, ${stats.completed} of ${stats.total} habits. ${STATUS_LABEL[stats.status]}`}>
      {pct}% <small>{stats.completed}/{stats.total}</small>
    </span>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={32} aria-hidden="true" />}
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function HabitCheckbox({ checked, disabled, label, onChange }) {
  return <input type="checkbox" className="check" checked={checked} disabled={disabled} aria-label={label} onChange={onChange} />;
}
