import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, Activity, FileStack, HardDrive, Crown } from 'lucide-react';
import { getStats } from '../../services/admin.service.js';
import AdminNav from '../../components/admin/AdminNav.jsx';
import MiniBarChart from '../../components/admin/MiniBarChart.jsx';
import Card from '../../components/ui/Card.jsx';
import { StatCardSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatBytes } from '../../lib/utils.js';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: getStats });

  const stats = data && [
    { icon: Users, label: 'Total users', value: data.users.total, color: 'text-brand-500 bg-brand-500/10' },
    { icon: UserPlus, label: 'New (30 days)', value: data.users.new30d, color: 'text-emerald-500 bg-emerald-500/10' },
    { icon: Activity, label: 'Active (7 days)', value: data.users.active7d, color: 'text-cyan-500 bg-cyan-500/10' },
    { icon: FileStack, label: 'Documents', value: data.documents.total, color: 'text-amber-500 bg-amber-500/10' },
    { icon: HardDrive, label: 'Storage used', value: formatBytes(data.documents.storageBytes), color: 'text-rose-500 bg-rose-500/10' },
    { icon: Crown, label: 'Paid users', value: (data.plans.pro || 0) + (data.plans.business || 0), color: 'text-purple-500 bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin Panel</h1>
      <AdminNav />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map(({ icon: Icon, label, value, color }) => (
              <Card key={label}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="mt-3 text-xl font-black text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </Card>
            ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-white">Signups — last 30 days</h3>
          {isLoading ? <div className="skeleton h-28" /> : <MiniBarChart data={data.charts.signups} />}
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-white">Activity — last 30 days</h3>
          {isLoading ? (
            <div className="skeleton h-28" />
          ) : (
            <MiniBarChart data={data.charts.activity} color="from-emerald-500 to-teal-400" />
          )}
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-white">Top actions (30 days)</h3>
        {isLoading ? (
          <div className="skeleton h-24" />
        ) : (
          <div className="space-y-2">
            {data.charts.topActions.map((a) => {
              const max = data.charts.topActions[0]?.count || 1;
              return (
                <div key={a.action} className="flex items-center gap-3">
                  <span className="w-32 truncate text-xs font-semibold capitalize text-slate-600 dark:text-slate-300">
                    {a.action.replace(/_/g, ' ')}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                      style={{ width: `${(a.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-slate-400">{a.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
