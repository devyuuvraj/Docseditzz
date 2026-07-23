import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, ShieldCheck, ShieldOff, UserX, UserCheck } from 'lucide-react';
import { listUsers, updateUser } from '../../services/admin.service.js';
import { apiErrorMessage } from '../../lib/axios.js';
import useDebounce from '../../hooks/useDebounce.js';
import AdminNav from '../../components/admin/AdminNav.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatBytes } from '../../lib/utils.js';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);
  const queryClient = useQueryClient();

  const params = { page, limit: 15, ...(debounced ? { search: debounced } : {}), ...(plan ? { plan } : {}) };
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => listUsers(params),
    keepPreviousData: true,
  });

  const mutate = async (id, body, msg) => {
    try {
      await updateUser(id, body);
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin Panel</h1>
      <AdminNav />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 text-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>
        <Select
          className="!h-10 w-36"
          value={plan}
          onChange={(e) => { setPlan(e.target.value); setPage(1); }}
          options={[
            { value: '', label: 'All plans' },
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
            { value: 'business', label: 'Business' },
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
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Storage</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800 dark:text-white">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={u.plan === 'free' ? 'default' : 'brand'} className="capitalize">{u.plan}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={u.role === 'admin' ? 'warning' : 'default'} className="capitalize">{u.role}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatBytes(u.storageUsed)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                          onClick={() => mutate(u.id, { role: u.role === 'admin' ? 'user' : 'admin' }, 'Role updated')}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-500/10 hover:text-brand-500"
                        >
                          {u.role === 'admin' ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </button>
                        <button
                          title={u.isActive ? 'Deactivate' : 'Reactivate'}
                          onClick={() => mutate(u.id, { isActive: !u.isActive }, u.isActive ? 'User deactivated' : 'User reactivated')}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </div>
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
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="self-center text-sm text-slate-500">
            {page} / {data.pagination.pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
