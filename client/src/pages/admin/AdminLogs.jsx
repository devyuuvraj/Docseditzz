import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { listLogs } from '../../services/admin.service.js';
import AdminNav from '../../components/admin/AdminNav.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';

const ACTIONS = [
  '', 'upload', 'download', 'delete', 'convert', 'merge', 'split', 'compress',
  'edit', 'share', 'summarize', 'ocr', 'ai', 'login', 'register',
];

const badgeVariant = (action) => {
  if (['delete', 'permanent_delete'].includes(action)) return 'danger';
  if (['login', 'register'].includes(action)) return 'brand';
  if (['summarize', 'ai', 'ocr'].includes(action)) return 'warning';
  return 'default';
};

export default function AdminLogs() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const params = { page, limit: 25, ...(action ? { action } : {}) };
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'logs', params],
    queryFn: () => listLogs(params),
    keepPreviousData: true,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin Panel</h1>
      <AdminNav />

      <Select
        className="!h-10 w-48"
        value={action}
        onChange={(e) => { setAction(e.target.value); setPage(1); }}
        options={ACTIONS.map((a) => ({ value: a, label: a ? a.replace(/_/g, ' ') : 'All actions' }))}
      />

      <Card className="!p-0">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={10} /></div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {data.logs.map((log) => (
              <li key={log._id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Badge variant={badgeVariant(log.action)} className="capitalize">{log.action.replace(/_/g, ' ')}</Badge>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {log.user?.name || 'Unknown'}
                </span>
                <span className="text-xs text-slate-400">{log.user?.email}</span>
                {(log.document?.name || log.meta?.name || log.meta?.output) && (
                  <span className="max-w-[220px] truncate text-xs text-slate-500 dark:text-slate-400">
                    → {log.document?.name || log.meta?.name || log.meta?.output}
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-400">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
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
