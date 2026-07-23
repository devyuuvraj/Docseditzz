import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { DollarSign } from 'lucide-react';
import { listSubscriptions } from '../../services/admin.service.js';
import AdminNav from '../../components/admin/AdminNav.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';

export default function AdminSubscriptions() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const params = { page, limit: 15, ...(status ? { status } : {}) };
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', params],
    queryFn: () => listSubscriptions(params),
    keepPreviousData: true,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin Panel</h1>
      <AdminNav />

      <div className="flex flex-wrap items-center gap-4">
        <Card className="flex items-center gap-3 !p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">${data?.mrr ?? '—'}</p>
            <p className="text-xs text-slate-400">Monthly recurring revenue</p>
          </div>
        </Card>
        <Select
          className="!h-10 w-40"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'expired', label: 'Expired' },
          ]}
        />
      </div>

      <Card className="!p-0">
        {isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 dark:border-white/10">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Started</th>
                  <th className="px-5 py-3">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.subscriptions.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800 dark:text-white">{s.user?.name}</p>
                      <p className="text-xs text-slate-400">{s.user?.email}</p>
                    </td>
                    <td className="px-5 py-3"><Badge variant="brand" className="capitalize">{s.plan}</Badge></td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">${s.priceMonthly}/mo</td>
                    <td className="px-5 py-3">
                      <Badge variant={s.status === 'active' ? 'success' : s.status === 'cancelled' ? 'danger' : 'default'} className="capitalize">
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data?.pagination?.pages > 1 && (
        <div className="flex justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="self-center text-sm text-slate-500">{page} / {data.pagination.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
