import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileStack, ScrollText, CreditCard } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const tabs = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/documents', label: 'Documents', icon: FileStack },
  { to: '/admin/logs', label: 'Logs', icon: ScrollText },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
];

export default function AdminNav() {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-lg shadow-brand-600/25'
                : 'glass text-slate-600 dark:text-slate-300'
            )
          }
        >
          <Icon className="h-4 w-4" /> {label}
        </NavLink>
      ))}
    </div>
  );
}
